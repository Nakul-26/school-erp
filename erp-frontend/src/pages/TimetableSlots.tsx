import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Plus, Trash2, Clock, CalendarRange } from 'lucide-react';

interface TimetableSlot {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  slot_type: 'period' | 'break';
}

export default function TimetableSlots() {
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    start_time: '',
    end_time: '',
    slot_type: 'period' as const
  });

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    try {
      setLoading(true);
      const data = await api.get('/timetable-slots');
      setSlots(data);
    } catch (err) {
      console.error('Error fetching timetable slots:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/timetable-slots', form);
      setShowModal(false);
      setForm({
        name: '',
        start_time: '',
        end_time: '',
        slot_type: 'period'
      });
      fetchSlots();
    } catch (err) {
      alert('Error creating slot');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this timetable slot?')) return;
    try {
      await api.delete(`/timetable-slots/${id}`);
      fetchSlots();
    } catch (err) {
      alert('Error deleting slot');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2>Timetable Slots</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Define academic periods and break timings
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Add Slot
        </button>
      </div>

      <div className="card">
        {loading ? (
          <p>Loading slots...</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Slot Name</th>
                <th>Timings</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => (
                <tr key={slot.id} style={slot.slot_type === 'break' ? { backgroundColor: '#f1f5f9' } : {}}>
                  <td>
                    <strong>{slot.name}</strong>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                      <Clock size={14} className="text-muted" />
                      <span>{slot.start_time} - {slot.end_time}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${slot.slot_type === 'break' ? 'badge-secondary' : 'badge-primary'}`}>
                      {slot.slot_type.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(slot.id)}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
              {slots.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '3rem' }}>
                    <Clock size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                    <p style={{ color: 'var(--text-muted)' }}>No timetable slots defined yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Add New Timetable Slot</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Slot Name (e.g. Period 1, Lunch Break)</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Period 1"
                  required
                />
              </div>
              <div className="form-group">
                <label>Slot Type</label>
                <select
                  value={form.slot_type}
                  onChange={(e) => setForm({ ...form, slot_type: e.target.value as any })}
                  required
                >
                  <option value="period">Academic Period</option>
                  <option value="break">Break / Recess</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Start Time (HH:MM)</label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>End Time (HH:MM)</label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
