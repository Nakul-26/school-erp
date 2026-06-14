import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';

export default function Sections() {
  const [sections, setSections] = useState<any[]>([]);
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
      setSections(sectionsData);
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
      fetchData();
    } catch (err) {
      alert('Error creating section');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await api.delete(`/sections/${id}`);
      fetchData();
    } catch (err) {
      alert('Error deleting');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h2>Sections</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>Add Section</button>
      </div>

      <div className="card">
        {loading ? <p>Loading...</p> : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Year</th>
                <th>Program</th>
                <th>Academic Year</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sections.map(section => (
                <tr key={section.id}>
                  <td>{section.name}</td>
                  <td>{section.year_number}</td>
                  <td>{programs.find(p => p.id === section.course_id)?.name || 'Unknown'}</td>
                  <td>{years.find(y => y.id === section.academic_year_id)?.name || 'Unknown'}</td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(section.id)}>Delete</button>
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
            <h3>Add Section</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Section Name (e.g., A, B, C)</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Year Number (e.g., 1, 2, 3)</label>
                <input type="number" value={form.year_number} onChange={e => setForm({...form, year_number: parseInt(e.target.value)})} required min="1" />
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
