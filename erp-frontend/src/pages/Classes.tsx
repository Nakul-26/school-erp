import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Classes() {
  const [classes, setClasses] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', year_number: 1, academic_year_id: '', course_id: '' });

  // Institution & Terminology States
  const { user } = useAuth();
  const [institutionType, setInstitutionType] = useState<string>('college');

  const getProgramLabel = () => institutionType === 'school' ? 'Class' : 'Program';
  const getSectionTitle = () => institutionType === 'school' ? 'Sections' : 'Classes & Sections';

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

      if (user?.institution_id) {
        const inst = await api.get(`/institutions/${user.institution_id}`);
        if (inst && inst.institution_type) {
          setInstitutionType(inst.institution_type);
        }
      }
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
        ...form,
        year_number: institutionType === 'school' ? 1 : form.year_number
      };
      await api.post('/sections', payload);
      setShowModal(false);
      setForm(f => ({ ...f, name: '', year_number: 1 }));
      fetchData();
    } catch (err) {
      alert(`Error creating section`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this section?')) return;
    try {
      await api.delete(`/sections/${id}`);
      fetchData();
    } catch (err) {
      alert('Error deleting section');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h2>{getSectionTitle()}</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Add {institutionType === 'school' ? 'Section' : 'Class/Section'}
        </button>
      </div>

      <div className="card">
        {loading ? <p>Loading...</p> : (
          <table className="table">
            <thead>
              <tr>
                <th>Section Name</th>
                {institutionType !== 'school' && <th>Year Number</th>}
                <th>{getProgramLabel()}</th>
                <th>Academic Year</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {classes.map(cls => (
                <tr key={cls.id}>
                  <td><strong>{cls.name}</strong></td>
                  {institutionType !== 'school' && <td>Year {cls.year_number}</td>}
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
                  <td colSpan={institutionType === 'school' ? 4 : 5} style={{ textAlign: 'center', padding: '2rem' }}>No sections found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000 }}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '440px', width: '100%', padding: '2rem', boxShadow: 'var(--shadow-lg)' }}>
            <h3>Add New {institutionType === 'school' ? 'Section' : 'Class/Section'}</h3>
            <form onSubmit={handleSubmit} style={{ marginTop: '1.25rem' }}>
              <div className="form-group">
                <label>Section Name (e.g., A, B, Section A)</label>
                <input 
                  type="text" 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})} 
                  placeholder="e.g. Section A"
                  required 
                />
              </div>
              {institutionType !== 'school' && (
                <div className="form-group">
                  <label>Year / Semester Number (e.g., 1, 2, 3)</label>
                  <input 
                    type="number" 
                    value={form.year_number} 
                    onChange={e => setForm({...form, year_number: parseInt(e.target.value) || 1})} 
                    required 
                    min="1" 
                  />
                </div>
              )}
              <div className="form-group">
                <label>{getProgramLabel()}</label>
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
              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
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
