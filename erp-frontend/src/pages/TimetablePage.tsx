import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Plus, Trash2, Clock, Calendar, BookOpen, User } from 'lucide-react';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';

// ── Interfaces ────────────────────────────────────────────────────────────────

interface TimetableSlot {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  slot_type: 'period' | 'break';
}

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

// ── Component ─────────────────────────────────────────────────────────────────

export default function TimetablePage() {
  const [activeTab, setActiveTab] = useState<'weekly' | 'periods'>('weekly');
  const getTodayDayName = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()] || 'Monday';
    return today === 'Sunday' ? 'Monday' : today;
  };
  const [selectedDayMobile, setSelectedDayMobile] = useState<string>(getTodayDayName());

  // ── Class Periods (formerly TimetableSlots) state ──────────────────────────
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [slotForm, setSlotForm] = useState({
    name: '',
    start_time: '',
    end_time: '',
    slot_type: 'period' as const,
  });

  // ── Weekly Timetable state ─────────────────────────────────────────────────
  const [timetable, setTimetable] = useState<WeeklyTimetableEntry[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [weeklySlots, setWeeklySlots] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [weeklyForm, setWeeklyForm] = useState({
    academic_year_id: '',
    section_id: '',
    slot_id: '',
    day_of_week: 'Monday',
    subject_id: '',
    teacher_id: '',
  });

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchSlots();
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (selectedSection) {
      fetchTimetable();
    } else {
      setTimetable([]);
    }
  }, [selectedSection]);

  // ── Class Periods handlers ─────────────────────────────────────────────────

  const fetchSlots = async () => {
    try {
      setSlotsLoading(true);
      const data = await api.get('/timetable-slots');
      setSlots(data);
    } catch (err) {
      console.error('Error fetching timetable slots:', err);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleSlotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/timetable-slots', slotForm);
      setShowSlotModal(false);
      setSlotForm({ name: '', start_time: '', end_time: '', slot_type: 'period' });
      fetchSlots();
    } catch (err) {
      alert('Error creating slot');
    }
  };

  const handleSlotDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class period?')) return;
    try {
      await api.delete(`/timetable-slots/${id}`);
      fetchSlots();
    } catch (err) {
      alert('Error deleting slot');
    }
  };

  // ── Weekly Timetable handlers ──────────────────────────────────────────────

  const fetchMetadata = async () => {
    try {
      setWeeklyLoading(true);
      const [sectionsData, teachersData, subjectsData, slotsData, yearsData] = await Promise.all([
        api.get('/sections'),
        api.get('/teachers'),
        api.get('/subjects'),
        api.get('/timetable-slots'),
        api.get('/academic-years'),
      ]);

      setSections(sectionsData);
      setTeachers(teachersData);
      setSubjects(subjectsData);
      setWeeklySlots(slotsData);
      setAcademicYears(yearsData);

      if (yearsData.length > 0) {
        const currentYear = yearsData.find((y: any) => y.is_current) || yearsData[0];
        setSelectedYear(currentYear.id);
        setWeeklyForm(f => ({ ...f, academic_year_id: currentYear.id }));
      }
      if (sectionsData.length > 0) {
        setSelectedSection(sectionsData[0].id);
        setWeeklyForm(f => ({ ...f, section_id: sectionsData[0].id }));
      }
      if (subjectsData.length > 0) {
        setWeeklyForm(f => ({ ...f, subject_id: subjectsData[0].id }));
      }
      if (teachersData.length > 0) {
        setWeeklyForm(f => ({ ...f, teacher_id: teachersData[0].id }));
      }
      if (slotsData.length > 0) {
        setWeeklyForm(f => ({ ...f, slot_id: slotsData[0].id }));
      }
    } catch (err) {
      console.error('Error fetching metadata:', err);
    } finally {
      setWeeklyLoading(false);
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
    setWeeklyForm(f => ({
      ...f,
      day_of_week: day,
      slot_id: slotId,
      section_id: selectedSection,
      academic_year_id: selectedYear,
    }));
    setShowWeeklyModal(true);
  };

  const handleWeeklySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/weekly-timetable', weeklyForm);
      setShowWeeklyModal(false);
      fetchTimetable();
    } catch (err) {
      alert('Conflict or error saving timetable entry. Check if slot is already occupied.');
    }
  };

  const handleWeeklyDelete = async (id: string, e: React.MouseEvent) => {
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

  // ── Render: Weekly Timetable ───────────────────────────────────────────────

  const renderWeekly = () => (
    <>
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
        <div className="card" style={{ padding: '1rem' }}>
          {weeklyLoading ? (
            <SkeletonLoader type="table" rows={6} cols={6} />
          ) : weeklySlots.length === 0 ? (
            <EmptyState
              title="No Class Periods Configured"
              description="Define class periods (breaks and subject periods) in the 'Class Periods' tab first to structure a weekly schedule."
              icon={Clock}
              action={{
                label: "Manage Class Periods",
                onClick: () => setActiveTab('periods')
              }}
            />
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="table-responsive timetable-table-desktop" style={{ overflowX: 'auto' }}>
                <table className="table" style={{ borderCollapse: 'collapse', width: '100%', minWidth: '800px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '120px', border: '1px solid var(--border)' }}>Day</th>
                      {weeklySlots.map(slot => (
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
                        {weeklySlots.map(slot => {
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
                              onMouseEnter={(e) => { if (!entry) e.currentTarget.style.backgroundColor = '#f5f3ff'; }}
                              onMouseLeave={(e) => { if (!entry) e.currentTarget.style.backgroundColor = '#ffffff'; }}
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
                                    onClick={(e) => handleWeeklyDelete(entry.id, e)}
                                    style={{
                                      alignSelf: 'flex-end',
                                      padding: '0.2rem 0.4rem',
                                      fontSize: '0.75rem',
                                      color: 'var(--danger)',
                                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                      border: 'none',
                                      borderRadius: '4px',
                                      marginTop: '0.5rem',
                                      cursor: 'pointer',
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
              </div>

              {/* Mobile Timeline View */}
              <div className="timetable-timeline-mobile">
                <div className="day-selector-scroll" style={{
                  display: 'flex',
                  gap: '0.5rem',
                  overflowX: 'auto',
                  paddingBottom: '0.75rem',
                  marginBottom: '1.25rem',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}>
                  {DAYS.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDayMobile(day)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '20px',
                        border: '1px solid var(--border)',
                        background: selectedDayMobile === day ? 'var(--primary)' : 'white',
                        color: selectedDayMobile === day ? 'white' : 'var(--text-main)',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        boxShadow: selectedDayMobile === day ? '0 2px 6px rgba(99,102,241,0.2)' : 'none'
                      }}
                    >
                      {day}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {weeklySlots.map(slot => {
                    const entry = getCellEntry(selectedDayMobile, slot.id);
                    return (
                      <div
                        key={slot.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          padding: '1rem',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          background: entry ? (slot.slot_type === 'break' ? '#f8fafc' : '#f0f4ff') : 'white'
                        }}
                      >
                        <div style={{ width: '85px', flexShrink: 0 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{slot.name}</span>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Clock size={10} />
                            <span>{slot.start_time}</span>
                          </div>
                        </div>

                        <div style={{ width: '1px', alignSelf: 'stretch', background: 'var(--border)' }}></div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          {entry ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>
                                  {entry.subject_code}
                                </span>
                                <h4 style={{ margin: '0.15rem 0 0 0', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                  {entry.subject_name}
                                </h4>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <User size={12} />
                                  <span>{entry.teacher_name || 'No Teacher'}</span>
                                </div>
                              </div>
                              <button
                                className="btn btn-sm"
                                onClick={(e) => handleWeeklyDelete(entry.id, e)}
                                style={{
                                  padding: '0.2rem 0.4rem',
                                  fontSize: '0.7rem',
                                  color: 'var(--danger)',
                                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => handleCellClick(selectedDayMobile, slot.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', height: '100%' }}
                            >
                              <Plus size={14} style={{ opacity: 0.5 }} />
                              <span style={{ opacity: 0.6 }}>Tap to assign...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {weeklySlots.length === 0 && (
                    <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No class periods configured.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Please select a section/class to display its weekly timetable.</p>
        </div>
      )}

      {/* Assign modal */}
      {showWeeklyModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Assign Timetable Slot</h3>
            <div style={{ marginBottom: '1.25rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <strong>Day:</strong> {weeklyForm.day_of_week} | <strong>Slot:</strong> {weeklySlots.find(s => s.id === weeklyForm.slot_id)?.name || 'Unknown'}
            </div>
            <form onSubmit={handleWeeklySubmit}>
              <div className="form-group">
                <label>Subject</label>
                <select value={weeklyForm.subject_id} onChange={(e) => setWeeklyForm({ ...weeklyForm, subject_id: e.target.value })} required>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name} ({s.subject_code})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Teacher</label>
                <select value={weeklyForm.teacher_id} onChange={(e) => setWeeklyForm({ ...weeklyForm, teacher_id: e.target.value })} required>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowWeeklyModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Assign Slot</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );

  // ── Render: Class Periods ──────────────────────────────────────────────────

  const renderPeriods = () => (
    <>
      <div className="card">
        {slotsLoading ? (
          <SkeletonLoader type="table" rows={4} cols={4} />
        ) : slots.length === 0 ? (
          <EmptyState
            title="No Class Periods Defined"
            description="Create breaks and lecture slots to build your school's weekly schedule."
            icon={Clock}
            action={{
              label: "Create Class Period",
              onClick: () => setShowSlotModal(true)
            }}
          />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Period Name</th>
                <th>Timings</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => (
                <tr key={slot.id} style={slot.slot_type === 'break' ? { backgroundColor: '#f1f5f9' } : {}}>
                  <td><strong>{slot.name}</strong></td>
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
                    <button className="btn btn-sm btn-danger" onClick={() => handleSlotDelete(slot.id)}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
              {/* Empty state is handled above by wrapper */}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Period modal */}
      {showSlotModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Add New Class Period</h3>
            <form onSubmit={handleSlotSubmit}>
              <div className="form-group">
                <label>Period Name (e.g. Period 1, Lunch Break)</label>
                <input
                  type="text"
                  value={slotForm.name}
                  onChange={(e) => setSlotForm({ ...slotForm, name: e.target.value })}
                  placeholder="e.g. Period 1"
                  required
                />
              </div>
              <div className="form-group">
                <label>Period Type</label>
                <select value={slotForm.slot_type} onChange={(e) => setSlotForm({ ...slotForm, slot_type: e.target.value as any })} required>
                  <option value="period">Academic Period</option>
                  <option value="break">Break / Recess</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Start Time (HH:MM)</label>
                  <input
                    type="time"
                    value={slotForm.start_time}
                    onChange={(e) => setSlotForm({ ...slotForm, start_time: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>End Time (HH:MM)</label>
                  <input
                    type="time"
                    value={slotForm.end_time}
                    onChange={(e) => setSlotForm({ ...slotForm, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowSlotModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Period</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );

  // ── Root render ────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2>Timetable</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            View the weekly schedule and manage class periods
          </p>
        </div>
        {activeTab === 'periods' && (
          <button className="btn btn-primary" onClick={() => setShowSlotModal(true)}>
            <Plus size={18} /> Add Period
          </button>
        )}
      </div>

      <div className="page-tabs">
        <button
          className={`page-tab${activeTab === 'weekly' ? ' active' : ''}`}
          onClick={() => setActiveTab('weekly')}
        >
          <Calendar size={16} /> Weekly Timetable
        </button>
        <button
          className={`page-tab${activeTab === 'periods' ? ' active' : ''}`}
          onClick={() => setActiveTab('periods')}
        >
          <Clock size={16} /> Class Periods
        </button>
      </div>

      {activeTab === 'weekly' && renderWeekly()}
      {activeTab === 'periods' && renderPeriods()}
    </Layout>
  );
}
