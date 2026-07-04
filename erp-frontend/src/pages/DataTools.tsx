import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import { api } from '../services/api';
import {
  Download, Users, FileSpreadsheet, Award, IndianRupee, Loader2,
  Upload, CheckCircle2, AlertCircle, HelpCircle,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────

type ImportType = 'students' | 'teachers' | 'subjects';

// ─── Component ─────────────────────────────────────────────────────────────

export default function DataTools() {
  // Page-level tab
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');

  // ── Export state ────────────────────────────────────────────────────────
  const [sections, setSections] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [exporting, setExporting] = useState<string | null>(null);

  // ── Import state ────────────────────────────────────────────────────────
  const [importTab, setImportTab] = useState<ImportType>('students');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // ── Effects ─────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchExportSelections();
  }, []);

  // ── Export helpers ──────────────────────────────────────────────────────

  const fetchExportSelections = async () => {
    try {
      const [secData, examData] = await Promise.all([
        api.get('/sections').catch(() => []),
        api.get('/exams').catch(() => []),
      ]);
      setSections(secData);
      setExams(examData);
      if (secData.length > 0) setSelectedSectionId(secData[0].id);
      if (examData.length > 0) setSelectedExamId(examData[0].id);
    } catch (err) {
      console.error('Failed to load selection lists:', err);
    }
  };

  const convertToCSV = (data: any[], headers: string[], keys: string[]) => {
    const rowData = data.map(row =>
      keys.map(key => {
        const val = row[key];
        if (val === undefined || val === null) return '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',')
    );
    return [headers.join(','), ...rowData].join('\n');
  };

  const downloadFile = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportStudents = async () => {
    try {
      setExporting('students');
      const data = await api.get('/students');
      const csv = convertToCSV(
        data,
        ['Admission Number', 'Roll Number', 'First Name', 'Middle Name', 'Last Name', 'Gender', 'Date of Birth', 'Email', 'Phone', 'Admission Date', 'Status'],
        ['admission_number', 'roll_number', 'first_name', 'middle_name', 'last_name', 'gender', 'date_of_birth', 'email', 'phone', 'admission_date', 'status']
      );
      downloadFile(csv, `students_export_${Date.now()}.csv`);
    } catch (err) {
      alert('Failed to export students data.');
    } finally {
      setExporting(null);
    }
  };

  const handleExportTeachers = async () => {
    try {
      setExporting('teachers');
      const data = await api.get('/teachers');
      const csv = convertToCSV(
        data,
        ['Employee ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Joining Date', 'Designation', 'Department', 'Status'],
        ['employee_id', 'first_name', 'last_name', 'email', 'phone', 'joining_date', 'designation', 'department', 'status']
      );
      downloadFile(csv, `teachers_export_${Date.now()}.csv`);
    } catch (err) {
      alert('Failed to export teachers data.');
    } finally {
      setExporting(null);
    }
  };

  const handleExportAttendance = async () => {
    if (!selectedSectionId) {
      alert('Please select a class/section first.');
      return;
    }
    try {
      setExporting('attendance');
      const data = await api.get(`/attendance/reports/students?section_id=${selectedSectionId}`);
      const csv = convertToCSV(
        data,
        ['Admission Number', 'Roll Number', 'First Name', 'Last Name', 'Total Sessions', 'Present Sessions', 'Absent Sessions', 'Late Sessions', 'Excused Sessions'],
        ['admission_number', 'roll_number', 'first_name', 'last_name', 'total_sessions', 'present_count', 'absent_count', 'late_count', 'excused_count']
      );
      const secName = sections.find(s => s.id === selectedSectionId)?.name || 'section';
      downloadFile(csv, `attendance_${secName}_export_${Date.now()}.csv`);
    } catch (err) {
      alert('Failed to export attendance report.');
    } finally {
      setExporting(null);
    }
  };

  const handleExportResults = async () => {
    if (!selectedExamId) {
      alert('Please select an exam event first.');
      return;
    }
    try {
      setExporting('results');
      const data = await api.get(`/exams/${selectedExamId}/results`);
      const csv = convertToCSV(
        data || [],
        ['Roll Number', 'Student Name', 'Total Marks Obtained', 'Max Marks', 'Percentage'],
        ['roll_number', 'name', 'total_obtained', 'total_max', 'percentage']
      );
      const examName = exams.find(e => e.id === selectedExamId)?.name || 'exam';
      downloadFile(csv, `results_${examName}_export_${Date.now()}.csv`);
    } catch (err) {
      alert('Failed to export exam results.');
    } finally {
      setExporting(null);
    }
  };

  const handleExportFees = async () => {
    try {
      setExporting('fees');
      const data = await api.get('/fees/student-records');
      const csv = convertToCSV(
        data,
        ['Admission Number', 'Student Name', 'Course/Program', 'Year', 'Fee Type', 'Total Dues (INR)', 'Paid Dues', 'Due Date', 'Status'],
        ['admission_number', 'student_name', 'course_name', 'year_number', 'fee_type', 'total_amount', 'paid_amount', 'due_date', 'status']
      );
      downloadFile(csv, `fees_ledger_export_${Date.now()}.csv`);
    } catch (err) {
      alert('Failed to export fee reports.');
    } finally {
      setExporting(null);
    }
  };

  // ── Import helpers ──────────────────────────────────────────────────────

  const handleImportTabChange = (tab: ImportType) => {
    setImportTab(tab);
    setImportFile(null);
    setImportResult(null);
    setImportError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setImportFile(files[0] || null);
      setImportResult(null);
      setImportError(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      setImportError('Please select a CSV file to upload.');
      return;
    }
    setImportError(null);
    setImportResult(null);
    setImportLoading(true);

    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const response = await api.upload(`/system/imports/${importTab}`, formData);
      setImportResult(response);
      setImportFile(null);
    } catch (err: any) {
      setImportError(err.message || 'Failed to upload and import records.');
    } finally {
      setImportLoading(false);
    }
  };

  // Import templates
  const templates = {
    students: {
      headers: ['admission_number', 'first_name', 'last_name', 'gender', 'date_of_birth', 'email', 'phone', 'roll_number'],
      example: ['STU-2026-0001', 'Nakul', 'Kumar', 'Male', '2005-08-15', 'nakul@school.edu', '9876543210', '101'],
    },
    teachers: {
      headers: ['employee_id', 'first_name', 'last_name', 'email', 'phone', 'joining_date', 'designation', 'department'],
      example: ['TCH-2026-0010', 'Ramesh', 'Sharma', 'ramesh@school.edu', '9123456789', '2024-06-01', 'Senior Lecturer', 'Computer Science'],
    },
    subjects: {
      headers: ['course_code', 'subject_code', 'subject_name', 'credits', 'semester'],
      example: ['BE-CSE', 'CS301', 'Database Management Systems', '4', '5'],
    },
  };

  const currentTemplate = templates[importTab];

  // ── Render helpers ──────────────────────────────────────────────────────

  const renderExport = () => (
    <>
      <div className="export-grid">
        {/* Core Records Card */}
        <div className="card export-card">
          <div className="card-header-icon">
            <Users style={{ color: 'var(--primary)' }} />
            <h3>Core Records</h3>
          </div>
          <p className="card-desc">Download complete register of all current students and teaching staff.</p>
          <div className="action-row">
            <button
              className="btn btn-outline"
              onClick={handleExportStudents}
              disabled={exporting !== null}
            >
              {exporting === 'students' ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
              Export Students (CSV)
            </button>
            <button
              className="btn btn-outline"
              onClick={handleExportTeachers}
              disabled={exporting !== null}
            >
              {exporting === 'teachers' ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
              Export Teachers (CSV)
            </button>
          </div>
        </div>

        {/* Attendance Reports */}
        <div className="card export-card">
          <div className="card-header-icon">
            <FileSpreadsheet style={{ color: 'var(--success)' }} />
            <h3>Class Attendance Registers</h3>
          </div>
          <p className="card-desc">Export overall session summary logs per student for a selected section.</p>
          <div className="filter-select-row">
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              disabled={exporting !== null}
            >
              <option value="">-- Select Class Section --</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.name} (Year {s.year_number})</option>)}
            </select>
            <button
              className="btn btn-primary"
              onClick={handleExportAttendance}
              disabled={exporting !== null || !selectedSectionId}
            >
              {exporting === 'attendance' ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
              Download Attendance
            </button>
          </div>
        </div>

        {/* Exam Results */}
        <div className="card export-card">
          <div className="card-header-icon">
            <Award style={{ color: 'var(--warning)' }} />
            <h3>Academic Performance Sheets</h3>
          </div>
          <p className="card-desc">Generate scorecards and student mark compilation spreadsheets for selected exam events.</p>
          <div className="filter-select-row">
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              disabled={exporting !== null}
            >
              <option value="">-- Select Exam Event --</option>
              {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <button
              className="btn btn-primary"
              onClick={handleExportResults}
              disabled={exporting !== null || !selectedExamId}
            >
              {exporting === 'results' ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
              Download Results
            </button>
          </div>
        </div>

        {/* Finance Records */}
        <div className="card export-card">
          <div className="card-header-icon">
            <IndianRupee style={{ color: 'var(--success)' }} />
            <h3>Finance &amp; Fee Ledgers</h3>
          </div>
          <p className="card-desc">Download student dues, collections, dates, and outstanding payment logs.</p>
          <div className="action-row">
            <button
              className="btn btn-outline"
              onClick={handleExportFees}
              disabled={exporting !== null}
            >
              {exporting === 'fees' ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
              Download Fee Ledger (CSV)
            </button>
          </div>
        </div>
      </div>
    </>
  );

  const renderImport = () => (
    <>
      {/* Import Type Tabs */}
      <div className="import-tabs">
        <button
          className={`tab-btn ${importTab === 'students' ? 'active' : ''}`}
          onClick={() => handleImportTabChange('students')}
          disabled={importLoading}
        >
          <FileSpreadsheet size={18} />
          Import Students
        </button>
        <button
          className={`tab-btn ${importTab === 'teachers' ? 'active' : ''}`}
          onClick={() => handleImportTabChange('teachers')}
          disabled={importLoading}
        >
          <FileSpreadsheet size={18} />
          Import Teachers
        </button>
        <button
          className={`tab-btn ${importTab === 'subjects' ? 'active' : ''}`}
          onClick={() => handleImportTabChange('subjects')}
          disabled={importLoading}
        >
          <FileSpreadsheet size={18} />
          Import Subjects
        </button>
      </div>

      <div className="import-container">
        {/* CSV Format Guide */}
        <div className="card guide-card">
          <div className="guide-header">
            <HelpCircle size={20} style={{ color: 'var(--primary)' }} />
            <h3>CSV Formatting Requirements</h3>
          </div>
          <p>Your spreadsheet file must contain a header row matching the fields below (order does not matter):</p>

          <div className="headers-box">
            {currentTemplate.headers.map(h => <code key={h}>{h}</code>)}
          </div>

          <p style={{ marginTop: '1rem', fontWeight: 600 }}>Example Row Sample:</p>
          <div className="example-box">
            <table>
              <thead>
                <tr>
                  {currentTemplate.headers.map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {currentTemplate.example.map((ex, idx) => <td key={idx}>{ex}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Upload Form Card */}
        <div className="card form-card">
          <h3>Upload CSV File</h3>

          {importError && (
            <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <AlertCircle size={18} />
              <span>{importError}</span>
            </div>
          )}

          {importResult && (
            <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                <CheckCircle2 size={18} />
                <span>Import completed successfully!</span>
              </div>
              <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                Imported: <strong>{importResult.imported}</strong> rows | Skipped/Errors: <strong>{importResult.skipped}</strong> rows
              </p>

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="error-log-box" style={{ marginTop: '0.75rem' }}>
                  <strong>Error Logs:</strong>
                  <ul>
                    {importResult.errors.map((errStr: string, idx: number) => (
                      <li key={idx} style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.15rem' }}>{errStr}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleUploadSubmit} className="upload-form">
            <div className="file-dropzone">
              <Upload size={32} style={{ color: 'var(--secondary)', opacity: 0.5 }} />
              <p>{importFile ? `Selected file: ${importFile.name}` : 'Drag and drop or select a CSV spreadsheet'}</p>
              <label className="btn btn-outline" style={{ marginTop: '0.75rem' }}>
                Browse Files
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={importLoading}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={importLoading || !importFile}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem', width: 'fit-content' }}
            >
              {importLoading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Parsing and importing records...
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Submit File
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );

  // ── Main render ─────────────────────────────────────────────────────────

  return (
    <Layout>
      <PageGuidance
        title="Data Tools"
        description="Use this page to export CSV data backups of student, teacher, attendance, results, and fee records — or to bulk-import new records from a spreadsheet. Select the appropriate tab to get started."
        steps={[
          'Switch to Export Data to download CSV files of any module.',
          'Switch to Import Data to upload a CSV spreadsheet and bulk-create records.',
          'Follow the on-screen template guide to ensure your CSV columns match the required format.',
        ]}
      />

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2>Data Tools</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Export and import school data in CSV format
          </p>
        </div>
      </div>

      {/* Page-level Tabs */}
      <div className="page-tabs" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`page-tab${activeTab === 'export' ? ' active' : ''}`}
          onClick={() => setActiveTab('export')}
        >
          Export Data
        </button>
        <button
          className={`page-tab${activeTab === 'import' ? ' active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          Import Data
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'export' ? renderExport() : renderImport()}

      {/* Shared styles for both export and import sections */}
      <style>{`
        .export-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 400px), 1fr));
          gap: 2rem;
          margin-top: 1rem;
        }
        @media (max-width: 480px) {
          .export-grid {
            grid-template-columns: 1fr;
          }
        }
        .export-card {
          padding: 2rem;
          display: flex;
          flex-direction: column;
        }
        .card-header-icon {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .card-header-icon h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
        }
        .card-desc {
          color: var(--text-muted);
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }
        .action-row {
          display: flex;
          gap: 1rem;
          margin-top: auto;
          flex-wrap: wrap;
        }
        .filter-select-row {
          display: flex;
          gap: 1rem;
          margin-top: auto;
          flex-wrap: wrap;
        }
        .filter-select-row select {
          flex: 1;
          min-width: 180px;
        }
        .import-tabs {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          border-bottom: 1px solid var(--border);
          padding-bottom: 0.75rem;
        }
        .tab-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.25rem;
          border-radius: 20px;
          border: 1px solid var(--border);
          background: white;
          cursor: pointer;
          font-weight: 600;
          color: var(--text-muted);
          transition: all 0.2s;
        }
        .tab-btn.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }
        .tab-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .import-container {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }
        .guide-card {
          padding: 1.5rem;
        }
        .guide-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }
        .guide-header h3 {
          margin: 0;
          font-size: 1rem;
        }
        .guide-card p {
          font-size: 0.875rem;
          color: var(--text-muted);
        }
        .headers-box {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.75rem;
          padding: 0.75rem;
          background: #f8fafc;
          border-radius: var(--radius-sm);
          border: 1px dashed var(--border);
        }
        .headers-box code {
          background: #e2e8f0;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .example-box {
          margin-top: 0.5rem;
          overflow-x: auto;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
        }
        .example-box table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.75rem;
        }
        .example-box th, .example-box td {
          padding: 0.5rem 0.75rem;
          text-align: left;
          border-bottom: 1px solid var(--border);
          white-space: nowrap;
        }
        .example-box th {
          background: #f1f5f9;
          font-weight: 700;
        }
        .form-card {
          padding: 2rem;
        }
        .form-card h3 {
          margin-top: 0;
          margin-bottom: 1.5rem;
          font-size: 1.1rem;
        }
        .file-dropzone {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 3rem 2rem;
          border: 2px dashed var(--border);
          border-radius: var(--radius-md);
          background: #fafafa;
          text-align: center;
        }
        .file-dropzone p {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin-top: 0.5rem;
        }
        .error-log-box {
          background: #fff1f0;
          border: 1px solid #ffa39e;
          border-radius: 4px;
          padding: 0.75rem;
          max-height: 200px;
          overflow-y: auto;
        }
        .error-log-box ul {
          margin: 0;
          padding-left: 1.25rem;
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Layout>
  );
}
