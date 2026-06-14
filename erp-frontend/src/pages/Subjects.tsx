import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';

export default function Subjects() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ subject_name: '', subject_code: '', credits: 3, semester: 1, course_id: '' });

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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/subjects', form);
      setShowModal(false);
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
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>Add Subject</button>
      </div>

      <div className="card">
        {loading ? <p>Loading...</p> : (
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Semester</th>
                <th>Credits</th>
                <th>Program</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map(subject => (
                <tr key={subject.id}>
                  <td>{subject.subject_code}</td>
                  <td>{subject.subject_name}</td>
                  <td>{subject.semester}</td>
                  <td>{subject.credits}</td>
                  <td>{programs.find(p => p.id === subject.course_id)?.name || 'Unknown'}</td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(subject.id)}>Delete</button>
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
            <h3>Add Subject</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Subject Code (e.g., CS301)</label>
                <input type="text" value={form.subject_code} onChange={e => setForm({...form, subject_code: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Subject Name (e.g., Data Structures)</label>
                <input type="text" value={form.subject_name} onChange={e => setForm({...form, subject_name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Semester</label>
                <input type="number" value={form.semester} onChange={e => setForm({...form, semester: parseInt(e.target.value)})} required min="1" />
              </div>
              <div className="form-group">
                <label>Credits</label>
                <input type="number" value={form.credits} onChange={e => setForm({...form, credits: parseInt(e.target.value)})} required min="0" />
              </div>
              <div className="form-group">
                <label>Program</label>
                <select value={form.course_id} onChange={e => setForm({...form, course_id: e.target.value})} required>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
