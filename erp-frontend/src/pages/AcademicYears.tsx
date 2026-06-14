import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';

export default function AcademicYears() {
  const [years, setYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '', is_current: 0 });

  useEffect(() => {
    fetchYears();
  }, []);

  const fetchYears = async () => {
    try {
      const data = await api.get('/academic-years');
      setYears(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/academic-years', form);
      setShowModal(false);
      setForm({ name: '', start_date: '', end_date: '', is_current: 0 });
      fetchYears();
    } catch (err) {
      alert('Error creating academic year');
    }
  };

  const toggleCurrent = async (id: string, isCurrent: number) => {
    try {
      await api.put(`/academic-years/${id}`, { is_current: isCurrent ? 0 : 1 });
      fetchYears();
    } catch (err) {
      alert('Error updating status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await api.delete(`/academic-years/${id}`);
      fetchYears();
    } catch (err) {
      alert('Error deleting');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h2>Academic Years</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>Add Academic Year</button>
      </div>

      <div className="card">
        {loading ? <p>Loading...</p> : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {years.map(year => (
                <tr key={year.id}>
                  <td>{year.name}</td>
                  <td>{year.start_date}</td>
                  <td>{year.end_date}</td>
                  <td>
                    <span className={`badge ${year.is_current ? 'badge-success' : 'badge-secondary'}`}>
                      {year.is_current ? 'Current' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-outline" onClick={() => toggleCurrent(year.id, year.is_current)}>
                      Set as {year.is_current ? 'Inactive' : 'Current'}
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(year.id)}>Delete</button>
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
            <h3>Add Academic Year</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name (e.g., 2025-26)</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Start Date</label>
                <input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>
                  <input type="checkbox" checked={!!form.is_current} onChange={e => setForm({...form, is_current: e.target.checked ? 1 : 0})} />
                  Set as current year
                </label>
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
