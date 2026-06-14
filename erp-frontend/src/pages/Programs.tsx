import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';

export default function Programs() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', course_code: '', duration_years: 1 });

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      const data = await api.get('/programs');
      setPrograms(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/programs', form);
      setShowModal(false);
      setForm({ name: '', course_code: '', duration_years: 1 });
      fetchPrograms();
    } catch (err) {
      alert('Error creating program');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await api.delete(`/programs/${id}`);
      fetchPrograms();
    } catch (err) {
      alert('Error deleting');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h2>Programs</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>Add Program</button>
      </div>

      <div className="card">
        {loading ? <p>Loading...</p> : (
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Duration (Years)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {programs.map(program => (
                <tr key={program.id}>
                  <td>{program.course_code}</td>
                  <td>{program.name}</td>
                  <td>{program.duration_years}</td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(program.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Add Program</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Program Code (e.g., CSE)</label>
                <input type="text" value={form.course_code} onChange={e => setForm({...form, course_code: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Program Name (e.g., B.E Computer Science)</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
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
