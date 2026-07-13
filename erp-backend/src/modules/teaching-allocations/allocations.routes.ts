import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { TeachingAllocationRepository } from './allocations.repository';
import { CreateAllocationInput, UpdateAllocationInput } from './allocations.types';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';
import { isYearLockedOrArchived } from '../../utils/academic-year-lock';

const allocations = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

allocations.use('*', authMiddleware);

// 1. GET /: List allocations
allocations.get('/', async (c) => {
  const user = c.get('user');
  const query = c.req.query();
  const repo = new TeachingAllocationRepository(c.env.DB);

  const list = await repo.list(user.institution_id, {
    academic_year_id: query.academic_year_id,
    department_id: query.department_id,
    program_id: query.program_id,
    teacher_id: query.teacher_id,
    section_id: query.section_id,
    subject_id: query.subject_id
  });

  return c.json(list);
});

// 2. GET /load/:teacherId: Retrieve teacher workload analysis
allocations.get('/load/:teacherId', async (c) => {
  const user = c.get('user');
  const teacherId = c.req.param('teacherId')!;
  const academicYearId = c.req.query('academic_year_id');

  if (!academicYearId) {
    return c.json({ error: 'academic_year_id query parameter is required' }, 400);
  }

  const repo = new TeachingAllocationRepository(c.env.DB);
  
  // Verify teacher belongs to institution
  const isOwner = await repo.validateTeacherStatus(teacherId, user.institution_id);
  if (!isOwner) {
    return c.json({ error: 'Teacher not found or inactive' }, 404);
  }

  const load = await repo.calculateTeacherLoad(teacherId, academicYearId);
  return c.json(load);
});

// 2.1. GET /dashboard: Count allocations, workloads, unallocated items and conflicts
allocations.get('/dashboard', async (c) => {
  const user = c.get('user');
  const academicYearId = c.req.query('academic_year_id');

  if (!academicYearId) {
    return c.json({ error: 'academic_year_id parameter is required' }, 400);
  }

  // Count active allocations
  const activeAllocationsRow = await c.env.DB.prepare(`
    SELECT COUNT(*) as total FROM teaching_allocations 
    WHERE institution_id = ? AND academic_year_id = ? AND is_active = 1 AND status = 'Active'
  `).bind(user.institution_id, academicYearId).first<{ total: number }>();

  // Fetch workloads
  const teacherLoads = await c.env.DB.prepare(`
    SELECT 
      teacher_id,
      SUM(theory_hours + practical_hours + tutorial_hours + mentoring_hours + admin_hours) as total_load
    FROM teaching_allocations
    WHERE institution_id = ? AND academic_year_id = ? AND is_active = 1 AND status = 'Active'
    GROUP BY teacher_id
  `).bind(user.institution_id, academicYearId).all<any>();

  let overloadedTeachers = 0;
  let healthyTeachers = 0;
  
  // Count active teachers
  const { results: allTeachers } = await c.env.DB.prepare(`
    SELECT id FROM teachers WHERE institution_id = ? AND is_active = 1 AND status = 'ACTIVE'
  `).bind(user.institution_id).all<any>();

  const allTeacherIds = allTeachers?.map(t => t.id) || [];
  
  for (const tId of allTeacherIds) {
    const load = teacherLoads.results?.find((l: any) => l.teacher_id === tId);
    const totalHours = load ? load.total_load : 0;
    if (totalHours > 24) {
      overloadedTeachers++;
    } else {
      healthyTeachers++;
    }
  }

  // Unallocated subjects
  const unallocatedSubjectsRow = await c.env.DB.prepare(`
    SELECT COUNT(*) as total
    FROM subjects s
    WHERE s.institution_id = ? AND s.is_active = 1
      AND s.id NOT IN (
        SELECT DISTINCT subject_id 
        FROM teaching_allocations 
        WHERE institution_id = ? AND academic_year_id = ? AND is_active = 1 AND status = 'Active'
      )
  `).bind(user.institution_id, user.institution_id, academicYearId).first<{ total: number }>();

  // Conflicts count
  const duplicatesRow = await c.env.DB.prepare(`
    SELECT COUNT(*) as total FROM (
      SELECT 1 FROM teaching_allocations 
      WHERE institution_id = ? AND academic_year_id = ? AND is_active = 1
      GROUP BY teacher_id, subject_id, section_id
      HAVING COUNT(*) > 1
    )
  `).bind(user.institution_id, academicYearId).first<{ total: number }>();

  const conflictsCount = (duplicatesRow?.total || 0) + overloadedTeachers;

  return c.json({
    activeAllocations: activeAllocationsRow?.total || 0,
    healthyTeachers,
    overloadedTeachers,
    unallocatedSubjects: unallocatedSubjectsRow?.total || 0,
    conflicts: conflictsCount
  });
});

// 2.2. GET /conflicts: Get detailed validation report warnings and errors
allocations.get('/conflicts', async (c) => {
  const user = c.get('user');
  const academicYearId = c.req.query('academic_year_id');

  if (!academicYearId) {
    return c.json({ error: 'academic_year_id parameter is required' }, 400);
  }

  const conflictsList: Array<{ type: 'error' | 'warning', message: string, record_id?: string, action_type?: string }> = [];

  // Find Duplicate Mappings
  const duplicates = await c.env.DB.prepare(`
    SELECT 
      a.id,
      (t.first_name || ' ' || t.last_name) as teacher_name,
      s.name as section_name,
      sub.subject_name,
      COUNT(*) as count
    FROM teaching_allocations a
    JOIN teachers t ON t.id = a.teacher_id
    JOIN sections s ON s.id = a.section_id
    JOIN subjects sub ON sub.id = a.subject_id
    WHERE a.institution_id = ? AND a.academic_year_id = ? AND a.is_active = 1
    GROUP BY a.teacher_id, a.subject_id, a.section_id
    HAVING count > 1
  `).bind(user.institution_id, academicYearId).all<any>();

  duplicates.results?.forEach((dup: any) => {
    conflictsList.push({
      type: 'error',
      message: `Duplicate Allocation: Teacher ${dup.teacher_name} is mapped ${dup.count} times to ${dup.subject_name} in ${dup.section_name}.`,
      record_id: dup.id,
      action_type: 'RESOLVE_DUPLICATE'
    });
  });

  // Find Teacher Overload Warnings
  const workloads = await c.env.DB.prepare(`
    SELECT 
      t.id as teacher_id,
      (t.first_name || ' ' || t.last_name) as teacher_name,
      SUM(a.theory_hours + a.practical_hours + a.tutorial_hours + a.mentoring_hours + a.admin_hours) as total_load
    FROM teaching_allocations a
    JOIN teachers t ON t.id = a.teacher_id
    WHERE a.institution_id = ? AND a.academic_year_id = ? AND a.is_active = 1 AND a.status = 'Active'
    GROUP BY t.id
    HAVING total_load > 24
  `).bind(user.institution_id, academicYearId).all<any>();

  workloads.results?.forEach((wl: any) => {
    conflictsList.push({
      type: 'warning',
      message: `Teacher Overloaded: ${wl.teacher_name} is scheduled for ${wl.total_load} weekly hours (recommended maximum: 24).`,
      record_id: wl.teacher_id,
      action_type: 'REDUCE_LOAD'
    });
  });

  // Find Unallocated Subjects in active sections
  const subjectGaps = await c.env.DB.prepare(`
    SELECT s.id, s.subject_name, s.subject_code, c.name as program_name
    FROM subjects s
    JOIN courses c ON c.id = s.course_id
    WHERE s.institution_id = ? AND s.is_active = 1
      AND s.id NOT IN (
        SELECT DISTINCT subject_id FROM teaching_allocations 
        WHERE institution_id = ? AND academic_year_id = ? AND is_active = 1 AND status = 'Active'
      )
  `).bind(user.institution_id, user.institution_id, academicYearId).all<any>();

  subjectGaps.results?.forEach((sg: any) => {
    conflictsList.push({
      type: 'warning',
      message: `Unallocated Subject: Subject ${sg.subject_name} (${sg.subject_code}) has no teachers assigned.`,
      record_id: sg.id,
      action_type: 'ASSIGN_TEACHER'
    });
  });

  // Inactive Reference Warnings
  const inactiveRefs = await c.env.DB.prepare(`
    SELECT 
      a.id,
      (t.first_name || ' ' || t.last_name) as teacher_name,
      t.status as teacher_status,
      s.name as section_name,
      sub.subject_name
    FROM teaching_allocations a
    JOIN teachers t ON t.id = a.teacher_id
    JOIN sections s ON s.id = a.section_id
    JOIN subjects sub ON sub.id = a.subject_id
    WHERE a.institution_id = ? AND a.academic_year_id = ? AND a.is_active = 1
      AND (t.status != 'ACTIVE' OR t.is_active = 0 OR s.is_active = 0 OR sub.is_active = 0)
  `).bind(user.institution_id, academicYearId).all<any>();

  inactiveRefs.results?.forEach((ref: any) => {
    conflictsList.push({
      type: 'error',
      message: `Inactive Reference: Allocation mappings reference an inactive entity (Teacher: ${ref.teacher_name} is ${ref.teacher_status}).`,
      record_id: ref.id,
      action_type: 'REMOVE_ALLOCATION'
    });
  });

  return c.json(conflictsList);
});

// 3. GET /:id: Retrieve single allocation
allocations.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new TeachingAllocationRepository(c.env.DB);

  const allocation = await repo.findById(id, user.institution_id);
  if (!allocation) {
    return c.json({ error: 'Allocation not found' }, 404);
  }

  return c.json(allocation);
});

// 4. POST /: Create teaching allocation (runs conflict checks)
allocations.post('/', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const input = await c.req.json<CreateAllocationInput>();
  const repo = new TeachingAllocationRepository(c.env.DB);

  // Validate academic year is not locked/archived
  const isYearLocked = await isYearLockedOrArchived(c.env.DB, input.academic_year_id);
  if (isYearLocked) {
    return c.json({ error: 'This academic year is locked or archived. Modifications are not allowed.' }, 400);
  }

  // 1. Verify target entities belong to this institution
  const isTeacherValid = await repo.validateTeacherStatus(input.teacher_id, user.institution_id);
  if (!isTeacherValid) {
    return c.json({ error: 'Invalid or inactive teacher assigned' }, 400);
  }

  // 2. Check duplicate mapping conflict
  const isDuplicate = await repo.checkDuplicateAllocation(
    input.teacher_id,
    input.subject_id,
    input.section_id,
    input.academic_year_id
  );
  if (isDuplicate) {
    return c.json({ error: 'Duplicate allocation: This teacher is already assigned to this subject and section for the selected academic year.' }, 400);
  }

  // 3. Insert record
  const id = crypto.randomUUID();
  try {
    await repo.create(id, user.institution_id, input, user.sub);
    await createAuditLog(
      c.env.DB,
      user.sub,
      'CREATE_TEACHING_ALLOCATION',
      'teaching_allocations',
      id,
      `Allocated teacher ID ${input.teacher_id} for subject ID ${input.subject_id} in section ID ${input.section_id}`
    );

    // Calculate updated workload to return as warning metadata if threshold is breached
    const load = await repo.calculateTeacherLoad(input.teacher_id, input.academic_year_id);
    const hasLoadWarning = load.total_hours > 24;

    return c.json({
      success: true,
      id,
      warning: hasLoadWarning ? `Warning: Teacher load is now at ${load.total_hours} weekly hours (recommended maximum is 24).` : null
    }, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 5. PUT /:id: Update allocation
allocations.put('/:id', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const input = await c.req.json<UpdateAllocationInput>();
  const repo = new TeachingAllocationRepository(c.env.DB);

  const existing = await repo.findById(id, user.institution_id);
  if (!existing) {
    return c.json({ error: 'Allocation not found' }, 404);
  }

  // Validate academic year is not locked/archived
  const isLockedOld = await isYearLockedOrArchived(c.env.DB, existing.academic_year_id);
  const isLockedNew = input.academic_year_id ? await isYearLockedOrArchived(c.env.DB, input.academic_year_id) : false;
  if (isLockedOld || isLockedNew) {
    return c.json({ error: 'This academic year is locked or archived. Modifications are not allowed.' }, 400);
  }

  // If changing teacher, subject, section, or academic year, check duplicates
  const teacherId = input.teacher_id || existing.teacher_id;
  const subjectId = input.subject_id || existing.subject_id;
  const sectionId = input.section_id || existing.section_id;
  const academicYearId = input.academic_year_id || existing.academic_year_id;

  if (
    teacherId !== existing.teacher_id ||
    subjectId !== existing.subject_id ||
    sectionId !== existing.section_id ||
    academicYearId !== existing.academic_year_id
  ) {
    const isDuplicate = await repo.checkDuplicateAllocation(teacherId, subjectId, sectionId, academicYearId, id);
    if (isDuplicate) {
      return c.json({ error: 'Conflict: An allocation already exists for this mapping.' }, 400);
    }
  }

  try {
    await repo.update(id, user.institution_id, input, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'UPDATE_TEACHING_ALLOCATION', 'teaching_allocations', id, `Updated allocation details`);
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 6. DELETE /:id: Soft delete allocation
allocations.delete('/:id', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  const repo = new TeachingAllocationRepository(c.env.DB);

  const existing = await repo.findById(id, user.institution_id);
  if (!existing) {
    return c.json({ error: 'Allocation not found' }, 404);
  }

  // Validate academic year is not locked/archived
  const isLocked = await isYearLockedOrArchived(c.env.DB, existing.academic_year_id);
  if (isLocked) {
    return c.json({ error: 'This academic year is locked or archived. Modifications are not allowed.' }, 400);
  }

  try {
    await repo.softDelete(id, user.institution_id, user.sub);
    await createAuditLog(c.env.DB, user.sub, 'DELETE_TEACHING_ALLOCATION', 'teaching_allocations', id, `Soft deleted teaching allocation`);
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 7. POST /bulk: Bulk Allocation Engine (handles previews and commits)
allocations.post('/bulk', requirePermission('academic.manage'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    academic_year_id: string;
    preview?: boolean;
    allocations: Array<any>;
  }>();

  const previewMode = body.preview !== false; // defaults to preview
  const repo = new TeachingAllocationRepository(c.env.DB);

  // Validate academic year is not locked/archived for commit mode
  if (!previewMode) {
    const isLocked = await isYearLockedOrArchived(c.env.DB, body.academic_year_id);
    if (isLocked) {
      return c.json({ error: 'This academic year is locked or archived. Modifications are not allowed.' }, 400);
    }
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const verifiedAllocations: Array<any> = [];

  // Fetch all existing teachers & sections for resolving info and workload checks
  const { results: teachers } = await c.env.DB.prepare("SELECT id, (first_name || ' ' || last_name) as name, status FROM teachers WHERE institution_id = ? AND is_active = 1").bind(user.institution_id).all<any>();
  const { results: sections } = await c.env.DB.prepare('SELECT id, name FROM sections WHERE institution_id = ? AND is_active = 1').bind(user.institution_id).all<any>();
  const { results: subjects } = await c.env.DB.prepare('SELECT id, subject_name, subject_code FROM subjects WHERE institution_id = ? AND is_active = 1').bind(user.institution_id).all<any>();

  // Teacher current workload cache
  const teacherLoadMap = new Map<string, number>();

  for (const alloc of body.allocations) {
    const teacher = teachers?.find(t => t.id === alloc.teacher_id);
    const section = sections?.find(s => s.id === alloc.section_id);
    const subject = subjects?.find(s => s.id === alloc.subject_id);

    const teacherName = teacher?.name || `ID ${alloc.teacher_id}`;
    const sectionName = section?.name || `ID ${alloc.section_id}`;
    const subjectName = subject?.subject_name || `ID ${alloc.subject_id}`;

    // Validate Statuses
    if (!teacher) {
      errors.push(`Error: Teacher ${teacherName} does not exist or is inactive.`);
      continue;
    } else if (teacher.status !== 'ACTIVE') {
      errors.push(`Error: Teacher ${teacherName} has inactive status: '${teacher.status}'.`);
      continue;
    }

    if (!section) {
      errors.push(`Error: Section ${sectionName} is invalid or inactive.`);
      continue;
    }

    if (!subject) {
      errors.push(`Error: Subject ${subjectName} is invalid or inactive.`);
      continue;
    }

    // Check duplicate inside database
    const isDuplicate = await repo.checkDuplicateAllocation(
      alloc.teacher_id,
      alloc.subject_id,
      alloc.section_id,
      body.academic_year_id
    );
    if (isDuplicate) {
      errors.push(`Error: Mapping already exists for ${teacherName} - ${subjectName} in ${sectionName}.`);
      continue;
    }

    // Accumulate workload hours to warn of overloads
    const loadHours = (alloc.theory_hours || 0) + (alloc.practical_hours || 0) + (alloc.tutorial_hours || 0) + (alloc.mentoring_hours || 0) + (alloc.admin_hours || 0);
    
    // Lazy load current teacher workload
    if (!teacherLoadMap.has(alloc.teacher_id)) {
      const currentLoad = await repo.calculateTeacherLoad(alloc.teacher_id, body.academic_year_id);
      teacherLoadMap.set(alloc.teacher_id, currentLoad.total_hours);
    }

    const currentHours = teacherLoadMap.get(alloc.teacher_id) || 0;
    const newHours = currentHours + loadHours;
    teacherLoadMap.set(alloc.teacher_id, newHours);

    if (newHours > 24) {
      warnings.push(`Warning: Allocation puts Teacher ${teacherName} at ${newHours} weekly load hours (recommended max: 24).`);
    }

    verifiedAllocations.push({
      ...alloc,
      institution_id: user.institution_id,
      academic_year_id: body.academic_year_id
    });
  }

  // If preview mode, return validation report
  if (previewMode || errors.length > 0) {
    return c.json({
      success: errors.length === 0,
      preview: true,
      errors,
      warnings,
      total_allocations: verifiedAllocations.length
    });
  }

  // Commit Phase: insert allocations
  try {
    const preparedStatements = verifiedAllocations.map(alloc => {
      const id = crypto.randomUUID();
      return c.env.DB.prepare(`
        INSERT INTO teaching_allocations (
          id, institution_id, academic_year_id, department_id, program_id, semester, year_number,
          section_id, subject_id, teacher_id, classes_per_week, theory_hours, practical_hours,
          tutorial_hours, mentoring_hours, admin_hours, primary_teacher, status, remarks, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        alloc.institution_id,
        alloc.academic_year_id,
        alloc.department_id,
        alloc.program_id,
        alloc.semester,
        alloc.year_number,
        alloc.section_id,
        alloc.subject_id,
        alloc.teacher_id,
        alloc.classes_per_week ?? 4,
        alloc.theory_hours ?? 0.0,
        alloc.practical_hours ?? 0.0,
        alloc.tutorial_hours ?? 0.0,
        alloc.mentoring_hours ?? 0.0,
        alloc.admin_hours ?? 0.0,
        alloc.primary_teacher ?? 1,
        alloc.status || 'Active',
        alloc.remarks || null,
        user.sub,
        user.sub
      );
    });

    // Execute batch D1 transactions
    if (preparedStatements.length > 0) {
      await c.env.DB.batch(preparedStatements);
      await createAuditLog(
        c.env.DB,
        user.sub,
        'BULK_TEACHING_ALLOCATION',
        'teaching_allocations',
        body.academic_year_id,
        `Bulk allocated ${preparedStatements.length} teaching assignments.`
      );
    }

    return c.json({
      success: true,
      preview: false,
      committed_count: preparedStatements.length,
      warnings
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default allocations;
