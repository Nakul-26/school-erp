import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Landmark, Save } from 'lucide-react';

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

export default function SalaryStructures() {
  const [teachers, setTeachers] = useState<TeacherSalary[]>([]);
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

  const handleValueChange = (index: number, field: keyof TeacherSalary, val: any) => {
    setTeachers(prev => prev.map((t, idx) => {
      if (idx === index) {
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

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2>Staff Salary Structures</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Set standard salary scales, tax withholdings, and provident fund components per teacher.
          </p>
        </div>
      </div>

      <div style={{
        padding: '1rem 1.25rem',
        backgroundColor: '#eff6ff',
        borderLeft: '4px solid #3b82f6',
        borderRadius: '6px',
        fontSize: '0.875rem',
        color: '#1e3a8a',
        lineHeight: '1.5',
        marginBottom: '1.25rem'
      }}>
        <strong>💡 Page Guidance:</strong> Manage salary structure models for all teachers. Enter Basic Salary, DA (Dearness Allowance), HRA (House Rent Allowance), and other components along with PF/tax withholdings. Make changes inline and click <em>Save</em> per row to apply changes.
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        {loading ? <p>Loading staff salary details...</p> : (
          <table className="table" style={{ fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th>Teacher</th>
                <th>Basic (₹)</th>
                <th>DA (₹)</th>
                <th>HRA (₹)</th>
                <th>Allowances (₹)</th>
                <th>PF Ded (₹)</th>
                <th>TDS Ded (₹)</th>
                <th>Other Ded (₹)</th>
                <th>Effective</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t, idx) => (
                <tr key={t.teacher_id}>
                  <td>
                    <strong>{t.first_name} {t.last_name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.employee_id} ({t.designation})</div>
                  </td>
                  <td>
                    <input
                      type="number"
                      value={t.basic_salary}
                      onChange={(e) => handleValueChange(idx, 'basic_salary', e.target.value)}
                      style={{ width: '80px', padding: '0.3rem', border: '1px solid var(--border)', borderRadius: '4px' }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={t.da}
                      onChange={(e) => handleValueChange(idx, 'da', e.target.value)}
                      style={{ width: '70px', padding: '0.3rem', border: '1px solid var(--border)', borderRadius: '4px' }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={t.hra}
                      onChange={(e) => handleValueChange(idx, 'hra', e.target.value)}
                      style={{ width: '70px', padding: '0.3rem', border: '1px solid var(--border)', borderRadius: '4px' }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={t.other_allowances}
                      onChange={(e) => handleValueChange(idx, 'other_allowances', e.target.value)}
                      style={{ width: '70px', padding: '0.3rem', border: '1px solid var(--border)', borderRadius: '4px' }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={t.pf_deduction}
                      onChange={(e) => handleValueChange(idx, 'pf_deduction', e.target.value)}
                      style={{ width: '70px', padding: '0.3rem', border: '1px solid var(--border)', borderRadius: '4px' }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={t.tds_deduction}
                      onChange={(e) => handleValueChange(idx, 'tds_deduction', e.target.value)}
                      style={{ width: '70px', padding: '0.3rem', border: '1px solid var(--border)', borderRadius: '4px' }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={t.other_deductions}
                      onChange={(e) => handleValueChange(idx, 'other_deductions', e.target.value)}
                      style={{ width: '70px', padding: '0.3rem', border: '1px solid var(--border)', borderRadius: '4px' }}
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={t.effective_from}
                      onChange={(e) => handleValueChange(idx, 'effective_from', e.target.value)}
                      style={{ width: '120px', padding: '0.3rem', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.75rem' }}
                    />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleSave(t)}
                      disabled={saving === t.teacher_id}
                    >
                      <Save size={12} /> {saving === t.teacher_id ? 'Saving' : 'Save'}
                    </button>
                  </td>
                </tr>
              ))}
              {teachers.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <Landmark size={32} style={{ marginBottom: '0.5rem' }} />
                    <p>No teachers registered in the system yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
