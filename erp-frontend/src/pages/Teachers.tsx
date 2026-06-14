import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Plus, Search, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Teachers() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    employee_id: '',
    first_name: '',
    last_name: '',
    email: '',
    designation: '',
    department: '',
    status: 'ACTIVE'
  });

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const data = await api.get('/teachers');
      setTeachers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/teachers', form);
      setShowModal(false);
      setForm({
        employee_id: '',
        first_name: '',
        last_name: '',
        email: '',
        designation: '',
        department: '',
        status: 'ACTIVE'
      });
      fetchTeachers();
    } catch (err) {
      alert('Error adding teacher');
    }
  };

  const filteredTeachers = teachers.filter(t => 
    `${t.first_name} ${t.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    t.employee_id.toLowerCase().includes(search.toLowerCase()) ||
    (t.department && t.department.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Layout>
      <div className="page-header">
        <h2>Teachers</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Add Teacher
        </button>
      </div>

      <div className="card filters" style={{ marginBottom: '1rem' }}>
        <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }}>
          <Search size={18} color="#666" />
          <input 
            type="text" 
            placeholder="Search by name, ID, or department..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '1rem' }}
          />
        </div>
      </div>

      <div className="card">
        {loading ? <p>Loading...</p> : (
          <table className="table">
            <thead>
              <tr>
                <th>Emp. ID</th>
                <th>Name</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.map(t => (
                <tr key={t.id}>
                  <td>{t.employee_id}</td>
                  <td>{t.first_name} {t.last_name}</td>
                  <td>{t.department || '-'}</td>
                  <td>{t.designation || '-'}</td>
                  <td>
                    <span className={`badge badge-${t.status === 'ACTIVE' ? 'success' : 'secondary'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td>
                    <Link to={`/teachers/${t.id}`} className="btn btn-sm btn-outline">
                      <Eye size={16} /> View
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredTeachers.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>No teachers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Add New Teacher</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>First Name</label>
                  <input required value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input required value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Employee ID</label>
                  <input required value={form.employee_id} onChange={e => setForm({...form, employee_id: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Email (Optional)</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Department</label>
                  <input value={form.department} onChange={e => setForm({...form, department: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Designation</label>
                  <input value={form.designation} onChange={e => setForm({...form, designation: e.target.value})} />
                </div>
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
