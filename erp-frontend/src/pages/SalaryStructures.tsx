import './SalaryStructures.css';
import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Landmark, Save, Trash2, Search } from 'lucide-react';

interface TeacherSalary {
  teacher_id: string;
  first_name: string;
  last_name: string;
  employee_id: string;
  designation: string;
  basic_salary: number;
  da: number;
  hra: number;
  other_allowances: number;
  pf_deduction: number;
  tds_deduction: number;
  other_deductions: number;
  effective_from: string;
}

export default function SalaryStructures({ isSubComponent = false }: { isSubComponent?: boolean }) {
  const [teachers, setTeachers] = useState<TeacherSalary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [designationFilter, setDesignationFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchSalaryStructures();
  }, []);

  const fetchSalaryStructures = async () => {
    try {
      setLoading(true);
      // Fetch all teachers
      const tList = await api.get('/teachers');
      // Fetch salary structures
      const sList = await api.get('/payroll/salary-structures');

      const mapped: TeacherSalary[] = tList.map((t: any) => {
        const struct = sList.find((s: any) => s.teacher_id === t.id) || {};
        return {
          teacher_id: t.id,
          first_name: t.first_name,
          last_name: t.last_name,
          employee_id: t.employee_id,
          designation: t.designation || 'Teacher',
          basic_salary: struct.basic_salary || 0,
          da: struct.da || 0,
          hra: struct.hra || 0,
          other_allowances: struct.other_allowances || 0,
          pf_deduction: struct.pf_deduction || 0,
          tds_deduction: struct.tds_deduction || 0,
          other_deductions: struct.other_deductions || 0,
          effective_from: struct.effective_from || new Date().toISOString().split('T')[0]
        };
      });
      setTeachers(mapped);
    } catch (err) {
      console.error('Error fetching salaries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (teacherId: string, field: keyof TeacherSalary, val: any) => {
    setTeachers(prev => prev.map((t) => {
      if (t.teacher_id === teacherId) {
        return {
          ...t,
          [field]: field === 'effective_from' ? val : Number(val)
        };
      }
      return t;
    }));
  };

  const handleSave = async (teacher: TeacherSalary) => {
    try {
      setSaving(teacher.teacher_id);
      await api.post('/payroll/salary-structures', {
        teacher_id: teacher.teacher_id,
        basic_salary: teacher.basic_salary,
        da: teacher.da,
        hra: teacher.hra,
        other_allowances: teacher.other_allowances,
        pf_deduction: teacher.pf_deduction,
        tds_deduction: teacher.tds_deduction,
        other_deductions: teacher.other_deductions,
        effective_from: teacher.effective_from
      });
      alert(`Salary structure for ${teacher.first_name} ${teacher.last_name} saved!`);
    } catch (err: any) {
      alert(err.message || 'Failed to save salary structure');
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteStructure = async (teacher: TeacherSalary) => {
    if (!confirm(`Are you sure you want to delete the salary structure for ${teacher.first_name} ${teacher.last_name}? They will be excluded from future payroll runs.`)) return;
    try {
      setSaving(teacher.teacher_id);
      await api.delete(`/payroll/salary-structures/${teacher.teacher_id}`);
      alert(`Salary structure for ${teacher.first_name} ${teacher.last_name} deleted.`);
      fetchSalaryStructures();
    } catch (err: any) {
      alert(err.message || 'Failed to delete salary structure');
    } finally {
      setSaving(null);
    }
  };

  const uniqueDesignations = Array.from(new Set(teachers.map(t => t.designation).filter(Boolean)));

  const filteredTeachers = teachers.filter(t => {
    const matchesSearch = `${t.first_name} ${t.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.employee_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDesignation = designationFilter === 'All' || t.designation === designationFilter;
    return matchesSearch && matchesDesignation;
  });

  const content = (
    <>
      {!isSubComponent && (
        <PageGuidance
          title="Staff Salary Structures"
          description="Use this page to set the standard salary details for teachers and staff. Enter the basic salary, allowances, and deductions. These settings are used automatically when monthly salaries are calculated."
          steps={["Configure basic pay, allowances (HRA, DA), and tax deductions for each employee.","Click Save inline to persist salary structural settings.","Calculations are used automatically during the monthly payroll runs."]}
        />
      )}
      <div className="page-header">
        <div>
          <h2>Staff Salary Structures</h2>
          <p className="salary-structures-text-1">
            Set standard salary scales, tax withholdings, and provident fund components per teacher.
          </p>
        </div>
      </div>

      <div className="card salary-structures-card">
        {/* Filters Bar */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <div className="search-container" style={{ flex: 1, maxWidth: '280px' }}>
            <Search size={14} />
            <input
              type="text"
              placeholder="Search staff by name or ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div>
            <select
              value={designationFilter}
              onChange={e => setDesignationFilter(e.target.value)}
              className="input"
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', cursor: 'pointer', height: 'auto', minWidth: '150px' }}
            >
              <option value="All">All Designations</option>
              {uniqueDesignations.map(desig => (
                <option key={desig} value={desig}>{desig}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? <p>Loading staff salary details...</p> : (
          <div className="salary-structures-table-wrapper">
            <table className="table salary-structures-table">
              <thead>
                <tr>
                  <th className="salary-structures-th-teacher">Teacher</th>
                  <th className="salary-structures-th-numeric">Basic (₹)</th>
                  <th className="salary-structures-th-numeric">DA (₹)</th>
                  <th className="salary-structures-th-numeric">HRA (₹)</th>
                  <th className="salary-structures-th-numeric">Allowances (₹)</th>
                  <th className="salary-structures-th-numeric">PF Ded (₹)</th>
                  <th className="salary-structures-th-numeric">TDS Ded (₹)</th>
                  <th className="salary-structures-th-numeric">Other Ded (₹)</th>
                  <th className="salary-structures-th-date">Effective</th>
                  <th className="salary-structures-th-actions">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((t) => (
                  <tr key={t.teacher_id}>
                    <td className="salary-structures-td-teacher">
                      <strong>{t.first_name} {t.last_name}</strong>
                      <div className="salary-structures-div-5">{t.employee_id} ({t.designation})</div>
                    </td>
                    <td className="salary-structures-td-numeric">
                      <input type="number" value={t.basic_salary} onChange={(e) => handleValueChange(t.teacher_id, 'basic_salary', e.target.value)} className="salary-structures-input-6"  />
                    </td>
                    <td className="salary-structures-td-numeric">
                      <input type="number" value={t.da} onChange={(e) => handleValueChange(t.teacher_id, 'da', e.target.value)} className="salary-structures-input-7"  />
                    </td>
                    <td className="salary-structures-td-numeric">
                      <input type="number" value={t.hra} onChange={(e) => handleValueChange(t.teacher_id, 'hra', e.target.value)} className="salary-structures-input-8"  />
                    </td>
                    <td className="salary-structures-td-numeric">
                      <input type="number" value={t.other_allowances} onChange={(e) => handleValueChange(t.teacher_id, 'other_allowances', e.target.value)} className="salary-structures-input-9"  />
                    </td>
                    <td className="salary-structures-td-numeric">
                      <input type="number" value={t.pf_deduction} onChange={(e) => handleValueChange(t.teacher_id, 'pf_deduction', e.target.value)} className="salary-structures-input-10"  />
                    </td>
                    <td className="salary-structures-td-numeric">
                      <input type="number" value={t.tds_deduction} onChange={(e) => handleValueChange(t.teacher_id, 'tds_deduction', e.target.value)} className="salary-structures-input-11"  />
                    </td>
                    <td className="salary-structures-td-numeric">
                      <input type="number" value={t.other_deductions} onChange={(e) => handleValueChange(t.teacher_id, 'other_deductions', e.target.value)} className="salary-structures-input-12"  />
                    </td>
                    <td className="salary-structures-td-date">
                      <input type="date" value={t.effective_from} onChange={(e) => handleValueChange(t.teacher_id, 'effective_from', e.target.value)} className="salary-structures-input-13"  />
                    </td>
                    <td className="salary-structures-td-actions">
                      <div className="salary-structures-actions-wrapper">
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleSave(t)}
                          disabled={saving === t.teacher_id}
                        >
                          <Save size={12} /> {saving === t.teacher_id ? 'Saving' : 'Save'}
                        </button>
                        <button
                          className="btn btn-sm btn-outline salary-structures-btn-delete"
                          onClick={() => handleDeleteStructure(t)}
                          disabled={saving === t.teacher_id}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              {filteredTeachers.length === 0 && (
                <tr>
                  <td colSpan={10} className="salary-structures-td-15">
                    <Landmark size={32} className="salary-structures-Landmark-16"  />
                    <p>{teachers.length === 0 ? "No teachers registered in the system yet." : "No staff match the selected filters."}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </>
  );

  if (isSubComponent) return content;
  return <Layout>{content}</Layout>;
}
