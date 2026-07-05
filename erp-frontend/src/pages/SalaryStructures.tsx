import './SalaryStructures.css';
import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
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
      <PageGuidance
        title="Staff Salary Structures"
        description="Use this page to set the standard salary details for teachers and staff. Enter the basic salary, allowances, and deductions. These settings are used automatically when monthly salaries are calculated."
        steps={["Configure basic pay, allowances (HRA, DA), and tax deductions for each employee.","Click Save inline to persist salary structural settings.","Calculations are used automatically during the monthly payroll runs."]}
      />
      <div className="page-header">
        <div>
          <h2>Staff Salary Structures</h2>
          <p className="salary-structures-text-1">
            Set standard salary scales, tax withholdings, and provident fund components per teacher.
          </p>
        </div>
      </div>

      

      <div className="card salary-structures-card">
        {loading ? <p>Loading staff salary details...</p> : (
          <table className="table salary-structures-table">
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
                <th className="salary-structures-th-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t, idx) => (
                <tr key={t.teacher_id}>
                  <td>
                    <strong>{t.first_name} {t.last_name}</strong>
                    <div className="salary-structures-div-5">{t.employee_id} ({t.designation})</div>
                  </td>
                  <td>
                    <input type="number" value={t.basic_salary} onChange={(e) => handleValueChange(idx, 'basic_salary', e.target.value)} className="salary-structures-input-6"  />
                  </td>
                  <td>
                    <input type="number" value={t.da} onChange={(e) => handleValueChange(idx, 'da', e.target.value)} className="salary-structures-input-7"  />
                  </td>
                  <td>
                    <input type="number" value={t.hra} onChange={(e) => handleValueChange(idx, 'hra', e.target.value)} className="salary-structures-input-8"  />
                  </td>
                  <td>
                    <input type="number" value={t.other_allowances} onChange={(e) => handleValueChange(idx, 'other_allowances', e.target.value)} className="salary-structures-input-9"  />
                  </td>
                  <td>
                    <input type="number" value={t.pf_deduction} onChange={(e) => handleValueChange(idx, 'pf_deduction', e.target.value)} className="salary-structures-input-10"  />
                  </td>
                  <td>
                    <input type="number" value={t.tds_deduction} onChange={(e) => handleValueChange(idx, 'tds_deduction', e.target.value)} className="salary-structures-input-11"  />
                  </td>
                  <td>
                    <input type="number" value={t.other_deductions} onChange={(e) => handleValueChange(idx, 'other_deductions', e.target.value)} className="salary-structures-input-12"  />
                  </td>
                  <td>
                    <input type="date" value={t.effective_from} onChange={(e) => handleValueChange(idx, 'effective_from', e.target.value)} className="salary-structures-input-13"  />
                  </td>
                  <td className="salary-structures-td-14">
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
                  <td colSpan={10} className="salary-structures-td-15">
                    <Landmark size={32} className="salary-structures-Landmark-16"  />
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
