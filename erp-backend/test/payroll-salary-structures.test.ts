import { describe, it, expect, beforeEach } from 'vitest';
import { env, reset } from 'cloudflare:test';
import { applySchema } from './helpers/apply-schema';
import { seedInstitution } from './helpers/seed';
import { PayrollRepository } from '../src/modules/payroll/payroll.repository';
import { PayrollService } from '../src/modules/payroll/payroll.service';

beforeEach(async () => {
  await reset();
  await applySchema(env.DB);
});

async function makeFixture() {
  const institutionId = crypto.randomUUID();
  const teacherId = crypto.randomUUID();

  await seedInstitution(env.DB, institutionId);
  await env.DB.prepare(`
    INSERT INTO teachers (id, institution_id, employee_id, first_name, last_name, designation)
    VALUES (?, ?, 'EMP-SAL-1', 'Test', 'Teacher', 'Senior Teacher')
  `).bind(teacherId, institutionId).run();

  const repo = new PayrollRepository(env.DB);
  const service = new PayrollService(repo);
  return { institutionId, teacherId, repo, service };
}

describe('PayrollService salary structures', () => {
  it('creates a new salary structure and lists it for the institution', async () => {
    const { institutionId, teacherId, service } = await makeFixture();

    await service.saveSalaryStructure(institutionId, {
      teacher_id: teacherId,
      basic_salary: 40000,
      da: 4000,
      hra: 8000,
      other_allowances: 1000,
      pf_deduction: 2000,
      tds_deduction: 500,
      other_deductions: 0,
      effective_from: '2026-04-01',
    } as any);

    const list = await service.listSalaryStructures(institutionId);
    expect(list).toHaveLength(1);
    expect(list[0].teacher_id).toBe(teacherId);
    expect(list[0].basic_salary).toBe(40000);
    expect(list[0].first_name).toBe('Test');
  });

  it('saving again for the same teacher updates in place rather than creating a duplicate row', async () => {
    const { institutionId, teacherId, repo, service } = await makeFixture();

    const firstId = await service.saveSalaryStructure(institutionId, {
      teacher_id: teacherId,
      basic_salary: 40000,
      da: 4000,
      hra: 8000,
      other_allowances: 1000,
      pf_deduction: 2000,
      tds_deduction: 500,
      other_deductions: 0,
      effective_from: '2026-04-01',
    } as any);

    const secondId = await service.saveSalaryStructure(institutionId, {
      teacher_id: teacherId,
      basic_salary: 45000,
      da: 4000,
      hra: 8000,
      other_allowances: 1000,
      pf_deduction: 2000,
      tds_deduction: 500,
      other_deductions: 0,
      effective_from: '2026-05-01',
    } as any);

    expect(secondId).toBe(firstId);

    const list = await service.listSalaryStructures(institutionId);
    expect(list).toHaveLength(1);
    expect(list[0].basic_salary).toBe(45000);
    expect(list[0].effective_from).toBe('2026-05-01');

    const single = await repo.getSalaryStructure(teacherId);
    expect(single?.basic_salary).toBe(45000);
  });

  it('deleting a salary structure soft-deletes it and it drops out of the list', async () => {
    const { institutionId, teacherId, repo, service } = await makeFixture();

    await service.saveSalaryStructure(institutionId, {
      teacher_id: teacherId,
      basic_salary: 40000,
      da: 4000,
      hra: 8000,
      other_allowances: 1000,
      pf_deduction: 2000,
      tds_deduction: 500,
      other_deductions: 0,
      effective_from: '2026-04-01',
    } as any);

    await repo.deleteSalaryStructure(teacherId);

    const list = await service.listSalaryStructures(institutionId);
    expect(list).toHaveLength(0);
    expect(await repo.getSalaryStructure(teacherId)).toBeNull();
  });
});
