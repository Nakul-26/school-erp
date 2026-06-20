import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';

export default function Departments() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', description: '' });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const data = await api.get('/departments');
      setDepartments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/departments', form);
      setShowModal(false);
      setForm({ name: '', code: '', description: '' });
      fetchDepartments();
    } catch (err) {
      alert('Error creating department');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      await api.delete(`/departments/${id}`);
      fetchDepartments();
    } catch (err) {
      alert('Error deleting department');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h2>Departments</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>Add Department</button>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        {loading ? <p>Loading...</p> : (
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map(dept => (
                <tr key={dept.id}>
                  <td><strong>{dept.code}</strong></td>
                  <td>{dept.name}</td>
                  <td>{dept.description || '-'}</td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(dept.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {departments.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center' }}>No departments found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Add Department</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Department Code (e.g., CSE)</label>
                <input type="text" value={form.code} onChange={e => setForm({...form, code: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Department Name (e.g., Computer Science & Engineering)</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea 
                  className="form-control" 
                  value={form.description} 
                  onChange={e => setForm({...form, description: e.target.value})}
                  style={{ width: '100%', minHeight: '80px', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-main)' }}
                />
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
