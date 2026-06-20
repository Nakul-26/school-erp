import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Plus, Trash2, Calendar, BookOpen, User, MapPin } from 'lucide-react';

interface WeeklyTimetableEntry {
  id: string;
  academic_year_id: string;
  teacher_id: string | null;
  subject_id: string;
  section_id: string;
  slot_id: string;
  day_of_week: string;
  teacher_name?: string;
  subject_name?: string;
  subject_code?: string;
  section_name?: string;
  slot_name?: string;
  start_time?: string;
  end_time?: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function WeeklyTimetable() {
  const [timetable, setTimetable] = useState<WeeklyTimetableEntry[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [form, setForm] = useState({
    academic_year_id: '',
    section_id: '',
    slot_id: '',
    day_of_week: 'Monday',
    subject_id: '',
    teacher_id: ''
  });

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (selectedSection) {
      fetchTimetable();
    } else {
      setTimetable([]);
    }
  }, [selectedSection]);

  const fetchMetadata = async () => {
    try {
      setLoading(true);
      const [sectionsData, teachersData, subjectsData, slotsData, yearsData] = await Promise.all([
        api.get('/sections'),
        api.get('/teachers'),
        api.get('/subjects'),
        api.get('/timetable-slots'),
        api.get('/academic-years')
      ]);
      
      setSections(sectionsData);
      setTeachers(teachersData);
      setSubjects(subjectsData);
      setSlots(slotsData);
      setAcademicYears(yearsData);
      
      if (yearsData.length > 0) {
        const currentYear = yearsData.find((y: any) => y.is_current) || yearsData[0];
        setSelectedYear(currentYear.id);
        setForm(f => ({ ...f, academic_year_id: currentYear.id }));
      }
      if (sectionsData.length > 0) {
        setSelectedSection(sectionsData[0].id);
        setForm(f => ({ ...f, section_id: sectionsData[0].id }));
      }
      if (subjectsData.length > 0) {
        setForm(f => ({ ...f, subject_id: subjectsData[0].id }));
      }
      if (teachersData.length > 0) {
        setForm(f => ({ ...f, teacher_id: teachersData[0].id }));
      }
      if (slotsData.length > 0) {
        setForm(f => ({ ...f, slot_id: slotsData[0].id }));
      }
    } catch (err) {
      console.error('Error fetching metadata:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimetable = async () => {
    try {
      const data = await api.get(`/weekly-timetable?section_id=${selectedSection}`);
      setTimetable(data);
    } catch (err) {
      console.error('Error fetching timetable:', err);
    }
  };

  const handleCellClick = (day: string, slotId: string) => {
    setForm(f => ({
      ...f,
      day_of_week: day,
      slot_id: slotId,
      section_id: selectedSection,
      academic_year_id: selectedYear
    }));
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/weekly-timetable', form);
      setShowModal(false);
      fetchTimetable();
    } catch (err) {
      alert('Conflict or error saving timetable entry. Check if slot is already occupied.');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Remove this assignment from the timetable?')) return;
    try {
      await api.delete(`/weekly-timetable/${id}`);
      fetchTimetable();
    } catch (err) {
      alert('Error deleting timetable entry');
    }
  };

  const getCellEntry = (day: string, slotId: string) => {
    return timetable.find(entry => entry.day_of_week === day && entry.slot_id === slotId);
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2>Weekly Timetable</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Set up the weekly teaching schedules for sections
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="filters">
          <div className="form-group" style={{ marginBottom: 0, minWidth: '200px' }}>
            <label>Select Academic Year</label>
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
              {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: '200px' }}>
            <label>Select Section/Class</label>
            <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)}>
              <option value="">-- Choose Section --</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.name} (Year {s.year_number})</option>)}
            </select>
          </div>
        </div>
      </div>

      {selectedSection ? (
        <div className="card" style={{ overflowX: 'auto', padding: '1rem' }}>
          {loading ? <p>Loading schedule...</p> : (
            <table className="table" style={{ borderCollapse: 'collapse', width: '100%', minWidth: '800px' }}>
              <thead>
                <tr>
                  <th style={{ width: '120px', border: '1px solid var(--border)' }}>Day</th>
                  {slots.map(slot => (
                    <th key={slot.id} style={{ border: '1px solid var(--border)', textAlign: 'center', padding: '1rem' }}>
                      <div style={{ fontWeight: 700 }}>{slot.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '0.25rem' }}>
                        {slot.start_time} - {slot.end_time}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map(day => (
                  <tr key={day}>
                    <td style={{ fontWeight: 700, border: '1px solid var(--border)', backgroundColor: '#f8fafc', padding: '1rem' }}>
                      {day}
                    </td>
                    {slots.map(slot => {
                      const entry = getCellEntry(day, slot.id);
                      return (
                        <td 
                          key={slot.id} 
                          onClick={() => !entry && handleCellClick(day, slot.id)}
                          style={{
                            border: '1px solid var(--border)',
                            verticalAlign: 'top',
                            padding: '0.5rem',
                            height: '110px',
                            cursor: entry ? 'default' : 'pointer',
                            backgroundColor: entry ? (slot.slot_type === 'break' ? '#f1f5f9' : '#e0e7ff') : '#ffffff',
                            transition: 'background-color 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            if (!entry) e.currentTarget.style.backgroundColor = '#f5f3ff';
                          }}
                          onMouseLeave={(e) => {
                            if (!entry) e.currentTarget.style.backgroundColor = '#ffffff';
                          }}
                        >
                          {entry ? (
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                              <div>
                                <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <BookOpen size={12} />
                                  <span>{entry.subject_code}</span>
                                </div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.25rem' }}>
                                  {entry.subject_name}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <User size={12} />
                                  <span>{entry.teacher_name || 'No Teacher'}</span>
                                </div>
                              </div>
                              <button 
                                className="btn btn-sm"
                                onClick={(e) => handleDelete(entry.id, e)}
                                style={{
                                  alignSelf: 'flex-end',
                                  padding: '0.2rem 0.4rem',
                                  fontSize: '0.75rem',
                                  color: 'var(--danger)',
                                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                  border: 'none',
                                  borderRadius: '4px',
                                  marginTop: '0.5rem',
                                  cursor: 'pointer'
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.8rem', opacity: 0.4 }}>
                              <Plus size={14} style={{ marginRight: '0.25rem' }} /> Assign
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Please select a section/class to display its weekly timetable.</p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Assign Timetable Slot</h3>
            <div style={{ marginBottom: '1.25rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <strong>Day:</strong> {form.day_of_week} | <strong>Slot:</strong> {slots.find(s => s.id === form.slot_id)?.name || 'Unknown'}
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Subject</label>
                <select 
                  value={form.subject_id} 
                  onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
                  required
                >
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name} ({s.subject_code})</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Teacher</label>
                <select 
                  value={form.teacher_id} 
                  onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
                  required
                >
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Assign Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
