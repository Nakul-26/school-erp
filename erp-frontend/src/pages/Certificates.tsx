import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { PageGuidance } from '../components/PageGuidance';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  Award, Shield, FileText, Search, Printer, 
  User, Calendar, Layers, MapPin, Phone 
} from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  roll_number: string | null;
  email: string;
  phone: string | null;
  date_of_birth: string;
  blood_group: string | null;
  course_name?: string;
  section_name?: string;
}

export default function Certificates() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Selection
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<'idcard' | 'bonafide' | 'tc'>('idcard');

  // Institution profile fallback
  const institutionName = (user as any)?.institution_name || 'Greenwood International School';
  const institutionAddress = 'Sector 15, Knowledge Park, Metro City, IN';

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const data = await api.get('/students');
      setStudents(data);
      if (data.length > 0) {
        setSelectedStudentId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedStudent = () => {
    return students.find(s => s.id === selectedStudentId);
  };

  const filteredStudents = students.filter(s => 
    s.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.admission_number.includes(searchQuery)
  );

  const student = getSelectedStudent();

  const handlePrint = () => {
    window.print();
  };

  // Convert Date
  const getFormattedDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Number to words converter (simplified for birth years)
  const getYearInWords = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const year = new Date(dateStr).getFullYear();
      // Simple lookup for demo
      return year.toString();
    } catch {
      return '';
    }
  };

  return (
    <Layout>
      <div className="no-print">
        <PageGuidance
          title="Official Credentials &amp; Certificates"
          description="Generate ready-to-print student ID cards, bonafide enrollment certificates, and checkout transfer certificates (TC)."
          steps={["Select a student and search using the dropdown list.","Choose your template: Student ID Card, Bonafide Certificate, or Transfer Certificate.","Click the Print button to open your printer options (automatically formatted for clean output)."]}
        />
      </div>

      <div className="page-header no-print">
        <div>
          <h2>Official Certificates &amp; Credentials</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Generate and print verified academic templates, ID badges, and leaving credentials
          </p>
        </div>
      </div>

      {/* Control panel */}
      <div className="card no-print" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', alignItems: 'flex-start' }}>

          {/* Student Picker */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Search Student</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 1 }} />
              <input
                type="text"
                placeholder="Type student name or admission number..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  // Auto-select if only one match
                  const matches = students.filter(s =>
                    `${s.first_name} ${s.last_name}`.toLowerCase().includes(e.target.value.toLowerCase()) ||
                    s.admission_number.includes(e.target.value)
                  );
                  if (matches.length === 1) setSelectedStudentId(matches[0].id);
                  else if (e.target.value === '') setSelectedStudentId('');
                }}
                style={{ paddingLeft: '2.25rem', marginBottom: searchQuery.length >= 1 ? '0.375rem' : 0 }}
              />
            </div>
            {searchQuery.length >= 1 && (
              <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: '#fff', boxShadow: 'var(--shadow-md)' }}>
                {filteredStudents.length === 0 ? (
                  <div style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No students found</div>
                ) : filteredStudents.map(s => (
                  <div
                    key={s.id}
                    onClick={() => { setSelectedStudentId(s.id); setSearchQuery(`${s.first_name} ${s.last_name}`); }}
                    style={{
                      padding: '0.625rem 1rem', cursor: 'pointer', fontSize: '0.85rem',
                      backgroundColor: selectedStudentId === s.id ? 'var(--primary-soft)' : 'transparent',
                      color: selectedStudentId === s.id ? 'var(--primary)' : 'var(--text-main)',
                      fontWeight: selectedStudentId === s.id ? 700 : 400,
                      borderBottom: '1px solid var(--border)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}
                    onMouseEnter={e => { if (selectedStudentId !== s.id) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-main)'; }}
                    onMouseLeave={e => { if (selectedStudentId !== s.id) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                  >
                    <span>{s.first_name} {s.last_name}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.admission_number}</span>
                  </div>
                ))}
              </div>
            )}
            {selectedStudentId && student && (
              <div style={{ marginTop: '0.375rem', fontSize: '0.775rem', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                ✓ {student.first_name} {student.last_name} selected
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Credential Type</label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value as any)}
              style={{ width: '100%', padding: '0.5rem' }}
            >
              <option value="idcard">🪪 Student ID Badge</option>
              <option value="bonafide">📄 Bonafide Certificate</option>
              <option value="tc">📋 Transfer Certificate (TC)</option>
            </select>
          </div>

          <button className="btn btn-primary" onClick={handlePrint} disabled={!selectedStudentId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', height: '40px', alignSelf: 'flex-end' }}>
            <Printer size={16} /> Print Document
          </button>
        </div>
      </div>

      {/* Main Print Container Area */}
      {loading ? <p>Loading students list...</p> : !student ? (
        <p className="no-data">Select a student from the control panel to generate credential.</p>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem', background: '#e2e8f0', borderRadius: 'var(--radius-lg)' }} className="print-canvas-wrapper">
          
          {/* Template 1: Student ID Badge */}
          {selectedTemplate === 'idcard' && (
            <div id="printable-idcard" style={{
              width: '320px',
              height: '480px',
              backgroundColor: '#ffffff',
              border: '2px solid #1e293b',
              borderRadius: '16px',
              boxShadow: 'var(--shadow-lg)',
              fontFamily: 'Inter, sans-serif',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              color: '#1e293b',
              padding: 0
            }} className="idcard-box">
              {/* Card Header */}
              <div style={{
                background: 'var(--primary-gradient)',
                color: '#ffffff',
                padding: '1.25rem 1rem',
                textAlign: 'center',
                borderBottom: '4px solid #f59e0b'
              }}>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {institutionName}
                </h2>
                <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.85, letterSpacing: '0.08em', fontWeight: 600 }}>
                  Student Identity Card
                </span>
              </div>

              {/* Photo & Basic Details */}
              <div style={{ textAlign: 'center', padding: '1rem 1.5rem', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {/* Photo frame */}
                <div style={{
                  width: '96px',
                  height: '110px',
                  border: '2px dashed var(--border-strong)',
                  borderRadius: '8px',
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-subtle)',
                  marginBottom: '1rem'
                }}>
                  <User size={36} />
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                  {student.first_name} {student.last_name}
                </h3>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.02em', marginTop: '0.15rem', display: 'block' }}>
                  {student.course_name || 'Class Section'} {student.section_name && ` - ${student.section_name}`}
                </span>

                {/* Grid attributes */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem 1rem',
                  width: '100%',
                  marginTop: '1.5rem',
                  fontSize: '0.75rem',
                  textAlign: 'left',
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: '0.75rem'
                }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.625rem', textTransform: 'uppercase' }}>Admission ID</span>
                    <strong>{student.admission_number}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.625rem', textTransform: 'uppercase' }}>Roll Number</span>
                    <strong>{student.roll_number || 'N/A'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.625rem', textTransform: 'uppercase' }}>Date of Birth</span>
                    <strong>{getFormattedDate(student.date_of_birth)}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.625rem', textTransform: 'uppercase' }}>Blood Group</span>
                    <strong>{student.blood_group || 'O+'}</strong>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div style={{
                backgroundColor: '#0f172a',
                color: '#ffffff',
                padding: '0.75rem 1rem',
                fontSize: '0.7rem',
                borderTop: '1px solid #1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <span style={{ display: 'block', color: '#94a3b8' }}>Emergency Contact</span>
                  <strong>{student.phone || '98765-43210'}</strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ width: '80px', height: '18px', backgroundColor: '#fff', padding: '1px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* Simulated barcode */}
                    <div style={{ width: '100%', height: '100%', backgroundImage: 'linear-gradient(90deg, #000 10%, transparent 10%, #000 20%, transparent 20%, #000 40%, transparent 40%, #000 50%, transparent 65%, #000 80%)' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Template 2: Bonafide Certificate */}
          {selectedTemplate === 'bonafide' && (
            <div id="printable-bonafide" style={{
              width: '100%',
              maxWidth: '700px',
              minHeight: '480px',
              backgroundColor: '#ffffff',
              border: '10px double #1e293b',
              padding: '3rem',
              boxShadow: 'var(--shadow-lg)',
              fontFamily: 'Georgia, serif',
              color: '#000000',
              position: 'relative'
            }} className="bonafide-box">
              {/* Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '1rem', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: 0, textTransform: 'uppercase' }}>
                  {institutionName}
                </h1>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', fontFamily: 'Inter, sans-serif', color: '#475569' }}>
                  {institutionAddress}
                </p>
              </div>

              {/* Title */}
              <div style={{ textAlign: 'center', margin: '2rem 0' }}>
                <h2 style={{ fontSize: '1.4rem', textDecoration: 'underline', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                  BONAFIDE CERTIFICATE
                </h2>
              </div>

              {/* Certificate content */}
              <div style={{ fontSize: '1.05rem', lineHeight: '2.0', textAlign: 'justify', textIndent: '2.5rem', marginBottom: '3rem' }}>
                This is to certify that <strong>{student.first_name} {student.last_name}</strong>, 
                son/daughter of <strong>Mr./Mrs. Guardian</strong>, is a bonafide student of 
                {` ${institutionName}`}. He/She is currently enrolled in 
                <strong> Class Section {student.section_name || 'A'}</strong> under the 
                <strong> {student.course_name || 'Primary Program'}</strong> course, 
                registered under Admission Number <strong>{student.admission_number}</strong>.
              </div>

              <div style={{ fontSize: '1.05rem', lineHeight: '2.0', textAlign: 'justify', marginBottom: '4rem' }}>
                According to the admission register, his/her date of birth is 
                <strong> {getFormattedDate(student.date_of_birth)}</strong>. 
                His/Her conduct and character during their study has been consistently satisfactory.
              </div>

              {/* Signature block */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.9rem', fontFamily: 'Inter, sans-serif' }}>
                <div>
                  <p>Date: {new Date().toLocaleDateString()}</p>
                  <p>Place: School Office</p>
                </div>
                <div style={{ textAlign: 'center', width: '180px', borderTop: '1px solid #000', paddingTop: '0.5rem' }}>
                  <strong>Principal Signature</strong>
                  <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '0.15rem' }}>Greenwood High School</div>
                </div>
              </div>
            </div>
          )}

          {/* Template 3: Transfer Certificate (TC) */}
          {selectedTemplate === 'tc' && (
            <div id="printable-tc" style={{
              width: '100%',
              maxWidth: '750px',
              backgroundColor: '#ffffff',
              border: '2px solid #000000',
              padding: '2.5rem',
              boxShadow: 'var(--shadow-lg)',
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.85rem',
              color: '#000000',
              lineHeight: '1.5'
            }} className="tc-box">
              {/* Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>
                  {institutionName}
                </h1>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#475569' }}>
                  {institutionAddress}
                </p>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.75rem', textDecoration: 'underline' }}>
                  School Leaving / Transfer Certificate
                </h2>
              </div>

              {/* Meta details */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '0.8rem', borderBottom: '1px dashed #ccc', paddingBottom: '0.5rem' }}>
                <div><strong>TC Register Page No:</strong> TC-{Date.now().toString().slice(-4)}</div>
                <div><strong>Admission ID:</strong> {student.admission_number}</div>
                <div><strong>Date of Issue:</strong> {new Date().toLocaleDateString()}</div>
              </div>

              {/* Checklist details */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2.5rem' }} className="tc-table">
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.5rem 0', width: '40%', fontWeight: 'bold' }}>1. Name of the Pupil</td>
                    <td style={{ padding: '0.5rem 0' }}>: {student.first_name} {student.last_name}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>2. Father's / Guardian's Name</td>
                    <td style={{ padding: '0.5rem 0' }}>: Parent Guardian</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>3. Nationality</td>
                    <td style={{ padding: '0.5rem 0' }}>: Indian</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>4. Date of first admission in School</td>
                    <td style={{ padding: '0.5rem 0' }}>: {getFormattedDate(student.date_of_birth)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>5. Date of Birth (in Christian Era)</td>
                    <td style={{ padding: '0.5rem 0' }}>: {getFormattedDate(student.date_of_birth)} (Year: {getYearInWords(student.date_of_birth)})</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>6. Class in which pupil last studied</td>
                    <td style={{ padding: '0.5rem 0' }}>: {student.course_name || 'Standard Syllabus'}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>7. School / Board Annual Exam last taken</td>
                    <td style={{ padding: '0.5rem 0' }}>: Passed and Cleared</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>8. Whether failed, if so once/twice</td>
                    <td style={{ padding: '0.5rem 0' }}>: No</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>9. Subjects Studied</td>
                    <td style={{ padding: '0.5rem 0' }}>: English, Mathematics, Sciences, Social Studies</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>10. Whether qualified for promotion</td>
                    <td style={{ padding: '0.5rem 0' }}>: Yes, promoted to next grade</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>11. Month up to which pupil has paid dues</td>
                    <td style={{ padding: '0.5rem 0' }}>: Fully Cleared</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>12. Any fee concession availed of</td>
                    <td style={{ padding: '0.5rem 0' }}>: No</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>13. Total No. of working days</td>
                    <td style={{ padding: '0.5rem 0' }}>: 210 Days</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>14. Total No. of working days present</td>
                    <td style={{ padding: '0.5rem 0' }}>: 198 Days</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>15. Reason for leaving the School</td>
                    <td style={{ padding: '0.5rem 0' }}>: Parent Relocation / Relocated to another city</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>16. General Conduct</td>
                    <td style={{ padding: '0.5rem 0' }}>: Exemplary</td>
                  </tr>
                </tbody>
              </table>

              {/* Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3.5rem', fontSize: '0.8rem' }}>
                <div style={{ borderTop: '1px solid #000', width: '130px', textAlign: 'center', paddingTop: '0.25rem' }}>Class Teacher</div>
                <div style={{ borderTop: '1px solid #000', width: '130px', textAlign: 'center', paddingTop: '0.25rem' }}>Checked by (Clerk)</div>
                <div style={{ borderTop: '1px solid #000', width: '130px', textAlign: 'center', paddingTop: '0.25rem' }}>Principal Signature</div>
              </div>
            </div>
          )}

        </div>
      )}
    </Layout>
  );
}
