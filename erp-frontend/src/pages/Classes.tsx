import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Plus, Trash2 } from 'lucide-react';

export default function Classes() {
  const [classes, setClasses] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', year_number: 1, academic_year_id: '', course_id: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sectionsData, yearsData, programsData] = await Promise.all([
        api.get('/sections'),
        api.get('/academic-years'),
        api.get('/programs')
      ]);
      setClasses(sectionsData);
      setYears(yearsData);
      setPrograms(programsData);
      if (yearsData.length > 0) setForm(f => ({ ...f, academic_year_id: yearsData[0].id }));
      if (programsData.length > 0) setForm(f => ({ ...f, course_id: programsData[0].id }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/sections', form);
      setShowModal(false);
      setForm(f => ({ ...f, name: '', year_number: 1 }));
      fetchData();
    } catch (err) {
      alert('Error creating class');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return;
    try {
      await api.delete(`/sections/${id}`);
      fetchData();
    } catch (err) {
      alert('Error deleting class');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h2>Classes</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Add Class
        </button>
      </div>

      <div className="card">
        {loading ? <p>Loading classes...</p> : (
          <table className="table">
            <thead>
              <tr>
                <th>Class Name</th>
                <th>Year</th>
                <th>Program</th>
                <th>Academic Year</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {classes.map(cls => (
                <tr key={cls.id}>
                  <td><strong>{cls.name}</strong></td>
                  <td>Year {cls.year_number}</td>
                  <td>{programs.find(p => p.id === cls.course_id)?.name || 'Unknown'}</td>
                  <td>{years.find(y => y.id === cls.academic_year_id)?.name || 'Unknown'}</td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(cls.id)}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
              {classes.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>No classes found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Add New Class</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Class/Section Name (e.g., A, B, Class 10A)</label>
                <input 
                  type="text" 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})} 
                  placeholder="e.g. Section A"
                  required 
                />
              </div>
              <div className="form-group">
                <label>Year Number (e.g., 1, 2, 3)</label>
                <input 
                  type="number" 
                  value={form.year_number} 
                  onChange={e => setForm({...form, year_number: parseInt(e.target.value) || 1})} 
                  required 
                  min="1" 
                />
              </div>
              <div className="form-group">
                <label>Program</label>
                <select value={form.course_id} onChange={e => setForm({...form, course_id: e.target.value})} required>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Academic Year</label>
                <select value={form.academic_year_id} onChange={e => setForm({...form, academic_year_id: e.target.value})} required>
                  {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
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
