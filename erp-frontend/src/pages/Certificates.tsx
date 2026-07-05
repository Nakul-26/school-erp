import './Certificates.css';
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
          <p className="certificates-text-1">
            Generate and print verified academic templates, ID badges, and leaving credentials
          </p>
        </div>
      </div>

      {/* Control panel */}
      <div className="card no-print certificates-card">
        <div className="certificates-grid-3">

          {/* Student Picker */}
          <div className="form-group certificates-form-group">
            <label>Search Student</label>
            <div className="certificates-div-5">
              <Search size={14} className="certificates-Search-6"  />
              <input
                type="text"
                placeholder="Type student name or admission number..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  const matches = students.filter(s =>
                    `${s.first_name} ${s.last_name}`.toLowerCase().includes(e.target.value.toLowerCase()) ||
                    (s.admission_number && s.admission_number.includes(e.target.value))
                  );
                  if (matches.length === 1 && matches[0]) setSelectedStudentId(matches[0].id);
                  else if (e.target.value === '') setSelectedStudentId('');
                }}
                style={{ paddingLeft: '2.25rem', marginBottom: searchQuery.length >= 1 ? '0.375rem' : 0 }}
              />
            </div>
            {searchQuery.length >= 1 && (
              <div className="certificates-div-7">
                {filteredStudents.length === 0 ? (
                  <div className="certificates-div-8">No students found</div>
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
                    <span className="certificates-span-9">{s.admission_number}</span>
                  </div>
                ))}
              </div>
            )}
            {selectedStudentId && student && (
              <div className="certificates-row-10">
                ✓ {student.first_name} {student.last_name} selected
              </div>
            )}
          </div>

          <div className="form-group certificates-form-group">
            <label>Credential Type</label>
            <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value as any)} className="certificates-select-12">
              <option value="idcard">🪪 Student ID Badge</option>
              <option value="bonafide">📄 Bonafide Certificate</option>
              <option value="tc">📋 Transfer Certificate (TC)</option>
            </select>
          </div>

          <button className="btn btn-primary certificates-btn" onClick={handlePrint} disabled={!selectedStudentId}>
            <Printer size={16} /> Print Document
          </button>
        </div>
      </div>

      {/* Main Print Container Area */}
      {loading ? <p>Loading students list...</p> : !student ? (
        <p className="no-data">Select a student from the control panel to generate credential.</p>
      ) : (
        <div className="print-canvas-wrapper certificates-print-canvas-wrapper">
          
          {/* Template 1: Student ID Badge */}
          {selectedTemplate === 'idcard' && (
            <div id="printable-idcard" className="idcard-box certificates-idcard-box">
              {/* Card Header */}
              <div className="certificates-div-16">
                <h2 className="certificates-title-17">
                  {institutionName}
                </h2>
                <span className="certificates-span-18">
                  Student Identity Card
                </span>
              </div>

              {/* Photo & Basic Details */}
              <div className="certificates-col-19">
                {/* Photo frame */}
                <div className="certificates-row-20">
                  <User size={36} />
                </div>

                <h3 className="certificates-title-21">
                  {student.first_name} {student.last_name}
                </h3>
                <span className="certificates-span-22">
                  {student.course_name || 'Class Section'} {student.section_name && ` - ${student.section_name}`}
                </span>

                {/* Grid attributes */}
                <div className="certificates-grid-23">
                  <div>
                    <span className="certificates-span-24">Admission ID</span>
                    <strong>{student.admission_number}</strong>
                  </div>
                  <div>
                    <span className="certificates-span-25">Roll Number</span>
                    <strong>{student.roll_number || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="certificates-span-26">Date of Birth</span>
                    <strong>{getFormattedDate(student.date_of_birth)}</strong>
                  </div>
                  <div>
                    <span className="certificates-span-27">Blood Group</span>
                    <strong>{student.blood_group || 'O+'}</strong>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="certificates-row-28">
                <div>
                  <span className="certificates-span-29">Emergency Contact</span>
                  <strong>{student.phone || '98765-43210'}</strong>
                </div>
                <div className="certificates-div-30">
                  <div className="certificates-row-31">
                    {/* Simulated barcode */}
                    <div className="certificates-div-32"  />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Template 2: Bonafide Certificate */}
          {selectedTemplate === 'bonafide' && (
            <div id="printable-bonafide" className="bonafide-box certificates-bonafide-box">
              {/* Header */}
              <div className="certificates-div-34">
                <h1 className="certificates-title-35">
                  {institutionName}
                </h1>
                <p className="certificates-text-36">
                  {institutionAddress}
                </p>
              </div>

              {/* Title */}
              <div className="certificates-div-37">
                <h2 className="certificates-title-38">
                  BONAFIDE CERTIFICATE
                </h2>
              </div>

              {/* Certificate content */}
              <div className="certificates-div-39">
                This is to certify that <strong>{student.first_name} {student.last_name}</strong>, 
                son/daughter of <strong>Mr./Mrs. Guardian</strong>, is a bonafide student of 
                {` ${institutionName}`}. He/She is currently enrolled in 
                <strong> Class Section {student.section_name || 'A'}</strong> under the 
                <strong> {student.course_name || 'Primary Program'}</strong> course, 
                registered under Admission Number <strong>{student.admission_number}</strong>.
              </div>

              <div className="certificates-div-40">
                According to the admission register, his/her date of birth is 
                <strong> {getFormattedDate(student.date_of_birth)}</strong>. 
                His/Her conduct and character during their study has been consistently satisfactory.
              </div>

              {/* Signature block */}
              <div className="certificates-row-41">
                <div>
                  <p>Date: {new Date().toLocaleDateString()}</p>
                  <p>Place: School Office</p>
                </div>
                <div className="certificates-div-42">
                  <strong>Principal Signature</strong>
                  <div className="certificates-div-43">Greenwood High School</div>
                </div>
              </div>
            </div>
          )}

          {/* Template 3: Transfer Certificate (TC) */}
          {selectedTemplate === 'tc' && (
            <div id="printable-tc" className="tc-box certificates-tc-box">
              {/* Header */}
              <div className="certificates-div-45">
                <h1 className="certificates-title-46">
                  {institutionName}
                </h1>
                <p className="certificates-text-47">
                  {institutionAddress}
                </p>
                <h2 className="certificates-title-48">
                  School Leaving / Transfer Certificate
                </h2>
              </div>

              {/* Meta details */}
              <div className="certificates-row-49">
                <div><strong>TC Register Page No:</strong> TC-{Date.now().toString().slice(-4)}</div>
                <div><strong>Admission ID:</strong> {student.admission_number}</div>
                <div><strong>Date of Issue:</strong> {new Date().toLocaleDateString()}</div>
              </div>

              {/* Checklist details */}
              <table className="tc-table certificates-tc-table">
                <tbody>
                  <tr className="certificates-tr-51">
                    <td className="certificates-td-52">1. Name of the Pupil</td>
                    <td className="certificates-td-53">: {student.first_name} {student.last_name}</td>
                  </tr>
                  <tr className="certificates-tr-54">
                    <td className="certificates-td-55">2. Father's / Guardian's Name</td>
                    <td className="certificates-td-56">: Parent Guardian</td>
                  </tr>
                  <tr className="certificates-tr-57">
                    <td className="certificates-td-58">3. Nationality</td>
                    <td className="certificates-td-59">: Indian</td>
                  </tr>
                  <tr className="certificates-tr-60">
                    <td className="certificates-td-61">4. Date of first admission in School</td>
                    <td className="certificates-td-62">: {getFormattedDate(student.date_of_birth)}</td>
                  </tr>
                  <tr className="certificates-tr-63">
                    <td className="certificates-td-64">5. Date of Birth (in Christian Era)</td>
                    <td className="certificates-td-65">: {getFormattedDate(student.date_of_birth)} (Year: {getYearInWords(student.date_of_birth)})</td>
                  </tr>
                  <tr className="certificates-tr-66">
                    <td className="certificates-td-67">6. Class in which pupil last studied</td>
                    <td className="certificates-td-68">: {student.course_name || 'Standard Syllabus'}</td>
                  </tr>
                  <tr className="certificates-tr-69">
                    <td className="certificates-td-70">7. School / Board Annual Exam last taken</td>
                    <td className="certificates-td-71">: Passed and Cleared</td>
                  </tr>
                  <tr className="certificates-tr-72">
                    <td className="certificates-td-73">8. Whether failed, if so once/twice</td>
                    <td className="certificates-td-74">: No</td>
                  </tr>
                  <tr className="certificates-tr-75">
                    <td className="certificates-td-76">9. Subjects Studied</td>
                    <td className="certificates-td-77">: English, Mathematics, Sciences, Social Studies</td>
                  </tr>
                  <tr className="certificates-tr-78">
                    <td className="certificates-td-79">10. Whether qualified for promotion</td>
                    <td className="certificates-td-80">: Yes, promoted to next grade</td>
                  </tr>
                  <tr className="certificates-tr-81">
                    <td className="certificates-td-82">11. Month up to which pupil has paid dues</td>
                    <td className="certificates-td-83">: Fully Cleared</td>
                  </tr>
                  <tr className="certificates-tr-84">
                    <td className="certificates-td-85">12. Any fee concession availed of</td>
                    <td className="certificates-td-86">: No</td>
                  </tr>
                  <tr className="certificates-tr-87">
                    <td className="certificates-td-88">13. Total No. of working days</td>
                    <td className="certificates-td-89">: 210 Days</td>
                  </tr>
                  <tr className="certificates-tr-90">
                    <td className="certificates-td-91">14. Total No. of working days present</td>
                    <td className="certificates-td-92">: 198 Days</td>
                  </tr>
                  <tr className="certificates-tr-93">
                    <td className="certificates-td-94">15. Reason for leaving the School</td>
                    <td className="certificates-td-95">: Parent Relocation / Relocated to another city</td>
                  </tr>
                  <tr className="certificates-tr-96">
                    <td className="certificates-td-97">16. General Conduct</td>
                    <td className="certificates-td-98">: Exemplary</td>
                  </tr>
                </tbody>
              </table>

              {/* Signatures */}
              <div className="certificates-row-99">
                <div className="certificates-div-100">Class Teacher</div>
                <div className="certificates-div-101">Checked by (Clerk)</div>
                <div className="certificates-div-102">Principal Signature</div>
              </div>
            </div>
          )}

        </div>
      )}
    </Layout>
  );
}
