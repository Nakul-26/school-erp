import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Plus, Search, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Students() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    admission_number: '',
    roll_number: '',
    first_name: '',
    last_name: '',
    email: '',
    status: 'ACTIVE'
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const data = await api.get('/students');
      setStudents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/students', form);
      setShowModal(false);
      setForm({
        admission_number: '',
        roll_number: '',
        first_name: '',
        last_name: '',
        email: '',
        status: 'ACTIVE'
      });
      fetchStudents();
    } catch (err) {
      alert('Error adding student');
    }
  };

  const filteredStudents = students.filter(s => 
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    s.admission_number.toLowerCase().includes(search.toLowerCase()) ||
    (s.roll_number && s.roll_number.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Layout>
      <div className="page-header">
        <h2>Students</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Add Student
        </button>
      </div>

      <div className="card filters" style={{ marginBottom: '1rem' }}>
        <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }}>
          <Search size={18} color="#666" />
          <input 
            type="text" 
            placeholder="Search by name, admission no, or roll no..." 
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
                <th>Adm. No</th>
                <th>Roll No</th>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(s => (
                <tr key={s.id}>
                  <td>{s.admission_number}</td>
                  <td>{s.roll_number || '-'}</td>
                  <td>{s.first_name} {s.last_name}</td>
                  <td>{s.email || '-'}</td>
                  <td>
                    <span className={`badge badge-${s.status === 'ACTIVE' ? 'success' : 'secondary'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td>
                    <Link to={`/students/${s.id}`} className="btn btn-sm btn-outline">
                      <Eye size={16} /> View
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>No students found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Add New Student</h3>
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
                  <label>Admission Number</label>
                  <input required value={form.admission_number} onChange={e => setForm({...form, admission_number: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Roll Number (Optional)</label>
                  <input value={form.roll_number} onChange={e => setForm({...form, roll_number: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>Email (Optional)</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
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
