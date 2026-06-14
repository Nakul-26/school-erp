import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Plus } from 'lucide-react';

export default function StudentDetails() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<any>(null);
  const [guardians, setGuardians] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [studentData, guardiansData, enrollmentsData, yearsData, programsData, sectionsData] = await Promise.all([
        api.get(`/students/${id}`),
        api.get(`/guardians/student/${id}`),
        api.get(`/enrollments/student/${id}`),
        api.get('/academic-years'),
        api.get('/programs'),
        api.get('/sections')
      ]);
      setStudent(studentData);
      setGuardians(guardiansData);
      setEnrollments(enrollmentsData);
      setAcademicYears(yearsData);
      setPrograms(programsData);
      setSections(sectionsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Layout><p>Loading...</p></Layout>;
  if (!student) return <Layout><p>Student not found.</p></Layout>;

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2 style={{ marginBottom: '0.25rem' }}>{student.first_name} {student.last_name}</h2>
          <span className={`badge badge-${student.status === 'ACTIVE' ? 'success' : 'secondary'}`}>
            {student.status}
          </span>
        </div>
      </div>

      <div className="tabs" style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #ddd', marginBottom: '1rem' }}>
        <button 
          style={{ padding: '0.75rem 1rem', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'overview' ? '2px solid #007bff' : 'none', color: activeTab === 'overview' ? '#007bff' : '#666', fontWeight: activeTab === 'overview' ? '600' : '400' }} 
          onClick={() => setActiveTab('overview')}
        >Overview</button>
        <button 
          style={{ padding: '0.75rem 1rem', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'guardians' ? '2px solid #007bff' : 'none', color: activeTab === 'guardians' ? '#007bff' : '#666', fontWeight: activeTab === 'guardians' ? '600' : '400' }} 
          onClick={() => setActiveTab('guardians')}
        >Guardians</button>
        <button 
          style={{ padding: '0.75rem 1rem', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'enrollments' ? '2px solid #007bff' : 'none', color: activeTab === 'enrollments' ? '#007bff' : '#666', fontWeight: activeTab === 'enrollments' ? '600' : '400' }} 
          onClick={() => setActiveTab('enrollments')}
        >Enrollments</button>
      </div>

      <div className="card">
        {activeTab === 'overview' && (
          <div>
            <h3 style={{ marginBottom: '1rem' }}>Personal Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Admission No</label>
                <span style={{ fontWeight: '500' }}>{student.admission_number}</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Roll No</label>
                <span style={{ fontWeight: '500' }}>{student.roll_number || '-'}</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Email</label>
                <span style={{ fontWeight: '500' }}>{student.email || '-'}</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Phone</label>
                <span style={{ fontWeight: '500' }}>{student.phone || '-'}</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Gender</label>
                <span style={{ fontWeight: '500' }}>{student.gender || '-'}</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Date of Birth</label>
                <span style={{ fontWeight: '500' }}>{student.date_of_birth || '-'}</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Admission Date</label>
                <span style={{ fontWeight: '500' }}>{student.admission_date || '-'}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'guardians' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Guardians</h3>
              <button className="btn btn-sm btn-primary"><Plus size={14} /> Add Guardian</button>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Relationship</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {guardians.map(g => (
                  <tr key={g.id}>
                    <td>{g.name}</td>
                    <td>{g.relationship}</td>
                    <td>{g.phone || '-'}</td>
                    <td>{g.email || '-'}</td>
                    <td>
                      <button className="btn btn-sm btn-danger">Remove</button>
                    </td>
                  </tr>
                ))}
                {guardians.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>No guardians added.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'enrollments' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Academic History</h3>
              <button className="btn btn-sm btn-primary"><Plus size={14} /> New Enrollment</button>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Academic Year</th>
                  <th>Program</th>
                  <th>Section</th>
                  <th>Semester</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map(e => (
                  <tr key={e.id}>
                    <td>{academicYears.find(y => y.id === e.academic_year_id)?.name || 'Unknown'}</td>
                    <td>{programs.find(p => p.id === e.course_id)?.name || 'Unknown'}</td>
                    <td>{sections.find(s => s.id === e.section_id)?.name || 'Unknown'}</td>
                    <td>{e.semester || '-'}</td>
                    <td><span className="badge badge-success">Active</span></td>
                  </tr>
                ))}
                {enrollments.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>No enrollment history found.</td>
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
