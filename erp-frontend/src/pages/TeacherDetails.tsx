import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Plus } from 'lucide-react';

export default function TeacherDetails() {
  const { id } = useParams<{ id: string }>();
  const [teacher, setTeacher] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [teacherData, assignmentsData, yearsData, programsData, sectionsData, subjectsData] = await Promise.all([
        api.get(`/teachers/${id}`),
        api.get(`/teacher-assignments/teacher/${id}`),
        api.get('/academic-years'),
        api.get('/programs'),
        api.get('/sections'),
        api.get('/subjects')
      ]);
      setTeacher(teacherData);
      setAssignments(assignmentsData);
      setAcademicYears(yearsData);
      setPrograms(programsData);
      setSections(sectionsData);
      setSubjects(subjectsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Layout><p>Loading...</p></Layout>;
  if (!teacher) return <Layout><p>Teacher not found.</p></Layout>;

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2 style={{ marginBottom: '0.25rem' }}>{teacher.first_name} {teacher.last_name}</h2>
          <span className={`badge badge-${teacher.status === 'ACTIVE' ? 'success' : 'secondary'}`}>
            {teacher.status}
          </span>
        </div>
      </div>

      <div className="tabs" style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #ddd', marginBottom: '1rem' }}>
        <button 
          style={{ padding: '0.75rem 1rem', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'overview' ? '2px solid #007bff' : 'none', color: activeTab === 'overview' ? '#007bff' : '#666', fontWeight: activeTab === 'overview' ? '600' : '400' }} 
          onClick={() => setActiveTab('overview')}
        >Overview</button>
        <button 
          style={{ padding: '0.75rem 1rem', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'assignments' ? '2px solid #007bff' : 'none', color: activeTab === 'assignments' ? '#007bff' : '#666', fontWeight: activeTab === 'assignments' ? '600' : '400' }} 
          onClick={() => setActiveTab('assignments')}
        >Subject Assignments</button>
      </div>

      <div className="card">
        {activeTab === 'overview' && (
          <div>
            <h3 style={{ marginBottom: '1rem' }}>General Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Employee ID</label>
                <span style={{ fontWeight: '500' }}>{teacher.employee_id}</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Email</label>
                <span style={{ fontWeight: '500' }}>{teacher.email || '-'}</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Phone</label>
                <span style={{ fontWeight: '500' }}>{teacher.phone || '-'}</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Department</label>
                <span style={{ fontWeight: '500' }}>{teacher.department || '-'}</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Designation</label>
                <span style={{ fontWeight: '500' }}>{teacher.designation || '-'}</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Joining Date</label>
                <span style={{ fontWeight: '500' }}>{teacher.joining_date || '-'}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assignments' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Subject Assignments</h3>
              <button className="btn btn-sm btn-primary"><Plus size={14} /> New Assignment</button>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Academic Year</th>
                  <th>Program</th>
                  <th>Section</th>
                  <th>Subject</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map(a => (
                  <tr key={a.id}>
                    <td>{academicYears.find(y => y.id === a.academic_year_id)?.name || 'Unknown'}</td>
                    <td>{programs.find(p => p.id === a.course_id)?.name || 'Unknown'}</td>
                    <td>{sections.find(s => s.id === a.section_id)?.name || 'Unknown'}</td>
                    <td>{subjects.find(s => s.id === a.subject_id)?.subject_name || 'Unknown'}</td>
                    <td>
                      <button className="btn btn-sm btn-danger">Remove</button>
                    </td>
                  </tr>
                ))}
                {assignments.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>No assignments found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
