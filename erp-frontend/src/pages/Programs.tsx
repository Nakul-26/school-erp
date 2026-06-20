import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';

export default function Programs() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', course_code: '', duration_years: 4, department_id: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [programsData, departmentsData] = await Promise.all([
        api.get('/programs'),
        api.get('/departments')
      ]);
      setPrograms(programsData);
      setDepartments(departmentsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        course_code: form.course_code,
        duration_years: form.duration_years,
        department_id: form.department_id || null
      };
      await api.post('/programs', payload);
      setShowModal(false);
      setForm({ name: '', course_code: '', duration_years: 4, department_id: '' });
      fetchData();
    } catch (err) {
      alert('Error creating program');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await api.delete(`/programs/${id}`);
      fetchData();
    } catch (err) {
      alert('Error deleting');
    }
  };

  const getDeptCode = (deptId: string) => {
    const dept = departments.find(d => d.id === deptId);
    return dept ? dept.code : '-';
  };

  return (
    <Layout>
      <div className="page-header">
        <h2>Courses & Programs</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>Add Course/Program</button>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        {loading ? <p>Loading...</p> : (
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Department</th>
                <th>Duration (Years)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {programs.map(program => (
                <tr key={program.id}>
                  <td><strong>{program.course_code}</strong></td>
                  <td>{program.name}</td>
                  <td>{getDeptCode(program.department_id)}</td>
                  <td>{program.duration_years}</td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(program.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {programs.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center' }}>No programs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Add Course/Program</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Course/Program Code (e.g., B.Tech CSE)</label>
                <input type="text" value={form.course_code} onChange={e => setForm({...form, course_code: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Course/Program Name (e.g., Bachelor of Technology in Computer Science)</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Department (Optional)</label>
                <select 
                  value={form.department_id} 
                  onChange={e => setForm({...form, department_id: e.target.value})}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-main)' }}
                >
                  <option value="">-- Select Department --</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Duration (Years)</label>
                <input type="number" value={form.duration_years} onChange={e => setForm({...form, duration_years: parseInt(e.target.value)})} required min="1" />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
