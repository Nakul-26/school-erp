import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function Subjects() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ subject_name: '', subject_code: '', credits: 3, semester: 1, course_id: '' });

  // Institution & Terminology States
  const { user } = useAuth();
  const [institutionType, setInstitutionType] = useState<string>('college');

  const getProgramLabel = () => institutionType === 'school' ? 'Class' : 'Program';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subjectsData, programsData] = await Promise.all([
        api.get('/subjects'),
        api.get('/programs')
      ]);
      setSubjects(subjectsData);
      setPrograms(programsData);
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
        subject_name: form.subject_name,
        subject_code: institutionType === 'school' 
          ? form.subject_name.toUpperCase().substring(0, 3) + Math.floor(100 + Math.random() * 900)
          : form.subject_code,
        semester: institutionType === 'school' ? 1 : form.semester,
        credits: institutionType === 'school' ? 0 : form.credits,
        course_id: form.course_id
      };
      await api.post('/subjects', payload);
      setShowModal(false);
      setForm({ subject_name: '', subject_code: '', credits: 3, semester: 1, course_id: programs[0]?.id || '' });
      fetchData();
    } catch (err) {
      alert('Error creating subject');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await api.delete(`/subjects/${id}`);
      fetchData();
    } catch (err) {
      alert('Error deleting');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h2>Subjects</h2>
        <button className="btn btn-primary" onClick={() => {
          setForm({ subject_name: '', subject_code: '', credits: 3, semester: 1, course_id: programs[0]?.id || '' });
          setShowModal(true);
        }}>Add Subject</button>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        {loading ? <p>Loading...</p> : (
          <table className="table">
            <thead>
              <tr>
                {institutionType !== 'school' && <th>Code</th>}
                <th>Name</th>
                {institutionType !== 'school' && <th>Semester</th>}
                {institutionType !== 'school' && <th>Credits</th>}
                <th>{getProgramLabel()}</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map(subject => (
                <tr key={subject.id}>
                  {institutionType !== 'school' && <td>{subject.subject_code}</td>}
                  <td><strong>{subject.subject_name}</strong></td>
                  {institutionType !== 'school' && <td>{subject.semester}</td>}
                  {institutionType !== 'school' && <td>{subject.credits}</td>}
                  <td>{programs.find(p => p.id === subject.course_id)?.name || 'Unknown'}</td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(subject.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {subjects.length === 0 && (
                <tr>
                  <td colSpan={institutionType === 'school' ? 3 : 6} style={{ textAlign: 'center' }}>No subjects found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1000 }}>
          <div className="modal-content" style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', maxWidth: '440px', width: '100%', padding: '2rem', boxShadow: 'var(--shadow-lg)' }}>
            <h3>Add Subject</h3>
            <form onSubmit={handleSubmit} style={{ marginTop: '1.25rem' }}>
              {institutionType !== 'school' && (
                <div className="form-group">
                  <label>Subject Code (e.g., CS301)</label>
                  <input type="text" value={form.subject_code} onChange={e => setForm({...form, subject_code: e.target.value})} required />
                </div>
              )}
              <div className="form-group">
                <label>Subject Name (e.g., Mathematics)</label>
                <input type="text" value={form.subject_name} onChange={e => setForm({...form, subject_name: e.target.value})} required />
              </div>
              {institutionType !== 'school' && (
                <>
                  <div className="form-group">
                    <label>Semester</label>
                    <input type="number" value={form.semester} onChange={e => setForm({...form, semester: parseInt(e.target.value) || 1})} required min="1" />
                  </div>
                  <div className="form-group">
                    <label>Credits</label>
                    <input type="number" value={form.credits} onChange={e => setForm({...form, credits: parseInt(e.target.value) || 0})} required min="0" />
                  </div>
                </>
              )}
              <div className="form-group">
                <label>{getProgramLabel()}</label>
                <select value={form.course_id} onChange={e => setForm({...form, course_id: e.target.value})} required>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
