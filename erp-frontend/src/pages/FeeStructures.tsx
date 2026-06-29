import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Plus, Trash2, Calendar, BookOpen, Layers, IndianRupee } from 'lucide-react';

interface FeeStructureRow {
  id: string;
  academic_year_name: string;
  course_name: string;
  course_code: string;
  year_number: number;
  fee_type: string;
  amount: number;
}

export default function FeeStructures() {
  const [structures, setStructures] = useState<FeeStructureRow[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    academic_year_id: '',
    course_id: '',
    year_number: 1,
    fee_type: 'Tuition Fee' as any,
    amount: ''
  });

  useEffect(() => {
    fetchMetadataAndStructures();
  }, []);

  const fetchMetadataAndStructures = async () => {
    try {
      setLoading(true);
      const [structuresData, yearsData, coursesData] = await Promise.all([
        api.get('/fees/structures'),
        api.get('/academic-years'),
        api.get('/programs')
      ]);

      setStructures(structuresData);
      setAcademicYears(yearsData);
      setCourses(coursesData);

      if (yearsData.length > 0) setForm(f => ({ ...f, academic_year_id: yearsData[0].id }));
      if (coursesData.length > 0) setForm(f => ({ ...f, course_id: coursesData[0].id }));
    } catch (err) {
      console.error('Error fetching metadata:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      return alert('Please enter a valid amount');
    }

    try {
      setSaving(true);
      await api.post('/fees/structures', {
        ...form,
        amount: Number(form.amount),
        year_number: Number(form.year_number)
      });
      alert('Fee structure created successfully!');
      setShowModal(false);
      setForm(f => ({ ...f, amount: '' }));
      // Reload structures
      const structuresData = await api.get('/fees/structures');
      setStructures(structuresData);
    } catch (err: any) {
      alert(err.message || 'Error creating fee structure');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fee structure? This will not affect already generated student ledgers.')) return;
    try {
      await api.delete(`/fees/structures/${id}`);
      setStructures(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      alert(err.message || 'Error deleting structure');
    }
  };

  return (
    <Layout>
      <PageGuidance
        title="Fee Structures"
        description="Use this page to set the fee amounts for different grades and terms."
        steps={["Define fee types (e.g. Tuition Fee, Exam Fee).","Set the exact amount required for each Grade level.","These rates will automatically generate fee balances for students."]}
      />
      <div className="page-header">
        <div>
          <h2>Fee Structures</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Configure and define billing structures for academic courses by year
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Add Fee Config
        </button>
      </div>

      <div className="card">
        {loading ? <p>Loading fee structures...</p> : structures.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <IndianRupee size={32} style={{ marginBottom: '0.5rem' }} />
            <p>No fee structures configured yet. Click "Add Fee Config" to configure one.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Academic Year</th>
                <th>Course / Program</th>
                <th>Year</th>
                <th>Fee Head</th>
                <th>Amount</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {structures.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.academic_year_name}</strong></td>
                  <td>
                    <strong>{s.course_code}</strong> - {s.course_name}
                  </td>
                  <td>Year {s.year_number}</td>
                  <td>
                    <span className="badge badge-secondary" style={{ textTransform: 'none' }}>
                      {s.fee_type}
                    </span>
                  </td>
                  <td><strong>₹{s.amount.toLocaleString('en-IN')}</strong></td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-sm btn-outline" style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }} onClick={() => handleDelete(s.id)}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h3>Add Fee Config</h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Academic Year</label>
                <select
                  value={form.academic_year_id}
                  onChange={(e) => setForm({ ...form, academic_year_id: e.target.value })}
                  required
                >
                  {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Course / Program</label>
                <select
                  value={form.course_id}
                  onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                  required
                >
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.course_code})</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Academic Year Number</label>
                <select
                  value={form.year_number}
                  onChange={(e) => setForm({ ...form, year_number: Number(e.target.value) })}
                  required
                >
                  <option value={1}>1st Year</option>
                  <option value={2}>2nd Year</option>
                  <option value={3}>3rd Year</option>
                  <option value={4}>4th Year</option>
                </select>
              </div>

              <div className="form-group">
                <label>Fee Head Type</label>
                <select
                  value={form.fee_type}
                  onChange={(e) => setForm({ ...form, fee_type: e.target.value as any })}
                  required
                >
                  <option value="Tuition Fee">Tuition Fee</option>
                  <option value="Exam Fee">Exam Fee</option>
                  <option value="Library Fee">Library Fee</option>
                  <option value="Other">Other Fees</option>
                </select>
              </div>

              <div className="form-group">
                <label>Amount (INR)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 'bold' }}>₹</span>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="75000"
                    required
                    style={{ paddingLeft: '2rem' }}
                  />
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Add Config'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
