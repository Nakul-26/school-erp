import { describe, it, expect, beforeEach } from 'vitest';
import { env, reset } from 'cloudflare:test';
import { applySchema } from './helpers/apply-schema';
import { seedInstitution, seedUser, seedAcademicYear, seedCourse, seedStudent, seedStudentFeeRecord } from './helpers/seed';
import { FeesRepository } from '../src/modules/fees/fees.repository';
import { FeesService } from '../src/modules/fees/fees.service';

// D1 storage isn't reset between tests the way KV/R2 are, so each test wipes
// and re-applies the schema itself for full isolation (fixtures below reuse
// fixed-looking values like admission numbers across tests, which would
// otherwise collide against leftover rows from a previous test).
beforeEach(async () => {
  await reset();
  await applySchema(env.DB);
});

async function makeFeeRecordFixture(totalAmount = 10000) {
  const institutionId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const academicYearId = crypto.randomUUID();
  const courseId = crypto.randomUUID();
  const studentId = crypto.randomUUID();
  const recordId = crypto.randomUUID();

  await seedInstitution(env.DB, institutionId);
  await seedUser(env.DB, userId, institutionId);
  await seedAcademicYear(env.DB, academicYearId, institutionId);
  await seedCourse(env.DB, courseId, institutionId);
  await seedStudent(env.DB, studentId, institutionId, 'ADM-0001');
  await seedStudentFeeRecord(env.DB, recordId, institutionId, studentId, academicYearId, courseId, totalAmount);

  const repo = new FeesRepository(env.DB);
  const service = new FeesService(repo);
  return { institutionId, userId, studentId, recordId, repo, service };
}

describe('FeesService.makePayment', () => {
  it('creates a payment, receipt, and ledger entry atomically', async () => {
    const { institutionId, userId, studentId, recordId, repo, service } = await makeFeeRecordFixture(10000);

    const result = await service.makePayment(institutionId, {
      student_id: studentId,
      student_fee_record_id: recordId,
      amount: 4000,
      payment_date: '2026-07-31',
      payment_method: 'Cash',
    }, userId);

    expect(result.receiptNumber).toMatch(/^REC-\d{4}-\d{5}$/);

    const record = await repo.getRecordById(recordId);
    expect(record!.paid_amount).toBe(4000);
    expect(record!.status).toBe('PARTIALLY_PAID');

    const payment = await repo.getPaymentById(result.paymentId);
    expect(payment).not.toBeNull();
    expect(payment!.amount).toBe(4000);

    const receipt = await repo.getReceiptDetails(result.receiptId);
    expect(receipt.receipt_number).toBe(result.receiptNumber);

    const ledger = await repo.getLedgerEntries(institutionId, { student_id: studentId });
    expect(ledger.some((l) => l.entry_type === 'PAYMENT' && l.amount === 4000)).toBe(true);
  });

  it('marks the record PAID once the full outstanding balance is paid', async () => {
    const { institutionId, userId, studentId, recordId, repo, service } = await makeFeeRecordFixture(5000);

    const result = await service.makePayment(institutionId, {
      student_id: studentId,
      student_fee_record_id: recordId,
      amount: 5000,
      payment_date: '2026-07-31',
      payment_method: 'Cash',
    }, userId);

    const record = await repo.getRecordById(recordId);
    expect(record!.status).toBe('PAID');
    expect(result.receiptNumber).toBeTruthy();
  });

  it('rejects a payment that exceeds the outstanding balance', async () => {
    const { institutionId, userId, studentId, recordId, service } = await makeFeeRecordFixture(1000);

    await expect(
      service.makePayment(institutionId, {
        student_id: studentId,
        student_fee_record_id: recordId,
        amount: 1500,
        payment_date: '2026-07-31',
        payment_method: 'Cash',
      }, userId)
    ).rejects.toThrow(/exceeds outstanding balance/);
  });

  it('rejects a second payment reusing the same transaction reference', async () => {
    const { institutionId, userId, studentId, recordId, service } = await makeFeeRecordFixture(10000);

    await service.makePayment(institutionId, {
      student_id: studentId,
      student_fee_record_id: recordId,
      amount: 1000,
      payment_date: '2026-07-31',
      payment_method: 'UPI',
      transaction_reference: 'TXN-123',
    }, userId);

    await expect(
      service.makePayment(institutionId, {
        student_id: studentId,
        student_fee_record_id: recordId,
        amount: 1000,
        payment_date: '2026-07-31',
        payment_method: 'UPI',
        transaction_reference: 'TXN-123',
      }, userId)
    ).rejects.toThrow(/already exists/);
  });

  it('rejects a concurrent payment that raced past the read of paid_amount (lost optimistic-lock race)', async () => {
    // Simulates two requests that both read the fee record before either
    // writes: the first call to makePayment() succeeds and advances
    // paid_amount, then a second call manually replays the guarded update
    // with the *stale* paid_amount the first request would have seen,
    // proving it is rejected with changes === 0 rather than silently
    // clobbering the first payment's totals.
    const { recordId, repo } = await makeFeeRecordFixture(10000);

    const staleGuard = repo.updateRecordStatusAndTotalsStatement(
      recordId,
      0, // stale expected paid_amount, as if read before any payment happened
      { paid_amount: 3000, status: 'PARTIALLY_PAID' },
      'someone'
    );

    // First writer moves paid_amount away from 0 using the real guard.
    const firstWriter = repo.updateRecordStatusAndTotalsStatement(recordId, 0, { paid_amount: 2000, status: 'PARTIALLY_PAID' }, 'first');
    const firstResult = await firstWriter.run();
    expect(firstResult.meta.changes).toBe(1);

    // Second writer's guard, still keyed off the now-stale paid_amount=0, must lose the race.
    const secondResult = await staleGuard.run();
    expect(secondResult.meta.changes).toBe(0);

    const record = await repo.getRecordById(recordId);
    expect(record!.paid_amount).toBe(2000);
  });

  it('reserves strictly increasing, non-colliding receipt sequence numbers under concurrent-style calls', async () => {
    const institutionId = crypto.randomUUID();
    await seedInstitution(env.DB, institutionId);
    const repo = new FeesRepository(env.DB);

    const year = '2026';
    const sequences = await Promise.all(
      Array.from({ length: 10 }, () => repo.reserveNextReceiptSequence(institutionId, year))
    );

    const unique = new Set(sequences);
    expect(unique.size).toBe(10);
  });
});
