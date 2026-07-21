import './DataTools.css';
import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
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

  const convertToExcel = (data: any[], headers: string[], keys: string[], fileName: string, sheetName: string = 'Sheet1') => {
    const formatted = data.map(row => {
      const obj: Record<string, any> = {};
      headers.forEach((header, idx) => {
        const key = keys[idx];
        if (!key) return;
        const val = row[key];
        obj[header] = val === undefined || val === null ? '' : val;
      });
      return obj;
    });
    const worksheet = XLSX.utils.json_to_sheet(formatted);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, fileName);
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

  const handleExportStudents = async (format: 'csv' | 'xlsx' = 'csv') => {
    try {
      setExporting(`students_${format}`);
      const data = await api.get('/students');
      const headers = ['Admission Number', 'Roll Number', 'First Name', 'Middle Name', 'Last Name', 'Gender', 'Date of Birth', 'Email', 'Phone', 'Admission Date', 'Status'];
      const keys = ['admission_number', 'roll_number', 'first_name', 'middle_name', 'last_name', 'gender', 'date_of_birth', 'email', 'phone', 'admission_date', 'status'];

      if (format === 'xlsx') {
        convertToExcel(data, headers, keys, `students_export_${Date.now()}.xlsx`, 'Students');
      } else {
        const csv = convertToCSV(data, headers, keys);
        downloadFile(csv, `students_export_${Date.now()}.csv`);
      }
    } catch (err) {
      alert('Failed to export students data.');
    } finally {
      setExporting(null);
    }
  };

  const handleExportTeachers = async (format: 'csv' | 'xlsx' = 'csv') => {
    try {
      setExporting(`teachers_${format}`);
      const data = await api.get('/teachers');
      const headers = ['Employee ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Joining Date', 'Designation', 'Department', 'Status'];
      const keys = ['employee_id', 'first_name', 'last_name', 'email', 'phone', 'joining_date', 'designation', 'department', 'status'];

      if (format === 'xlsx') {
        convertToExcel(data, headers, keys, `teachers_export_${Date.now()}.xlsx`, 'Teachers');
      } else {
        const csv = convertToCSV(data, headers, keys);
        downloadFile(csv, `teachers_export_${Date.now()}.csv`);
      }
    } catch (err) {
      alert('Failed to export teachers data.');
    } finally {
      setExporting(null);
    }
  };

  const handleExportAttendance = async (format: 'csv' | 'xlsx' = 'csv') => {
    if (!selectedSectionId) {
      alert('Please select a class/section first.');
      return;
    }
    try {
      setExporting(`attendance_${format}`);
      const data = await api.get(`/attendance/reports/students?section_id=${selectedSectionId}`);
      const headers = ['Admission Number', 'Roll Number', 'First Name', 'Last Name', 'Total Sessions', 'Present Sessions', 'Absent Sessions', 'Late Sessions', 'Excused Sessions'];
      const keys = ['admission_number', 'roll_number', 'first_name', 'last_name', 'total_sessions', 'present_count', 'absent_count', 'late_count', 'excused_count'];
      const secName = sections.find(s => s.id === selectedSectionId)?.name || 'section';

      if (format === 'xlsx') {
        convertToExcel(data, headers, keys, `attendance_${secName}_export_${Date.now()}.xlsx`, 'Attendance');
      } else {
        const csv = convertToCSV(data, headers, keys);
        downloadFile(csv, `attendance_${secName}_export_${Date.now()}.csv`);
      }
    } catch (err) {
      alert('Failed to export attendance report.');
    } finally {
      setExporting(null);
    }
  };

  const handleExportResults = async (format: 'csv' | 'xlsx' = 'csv') => {
    if (!selectedExamId) {
      alert('Please select an exam event first.');
      return;
    }
    try {
      setExporting(`results_${format}`);
      const data = await api.get(`/exams/${selectedExamId}/results`);
      const headers = ['Roll Number', 'Student Name', 'Total Marks Obtained', 'Max Marks', 'Percentage'];
      const keys = ['roll_number', 'name', 'total_obtained', 'total_max', 'percentage'];
      const examName = exams.find(e => e.id === selectedExamId)?.name || 'exam';

      if (format === 'xlsx') {
        convertToExcel(data || [], headers, keys, `results_${examName}_export_${Date.now()}.xlsx`, 'Exam Results');
      } else {
        const csv = convertToCSV(data || [], headers, keys);
        downloadFile(csv, `results_${examName}_export_${Date.now()}.csv`);
      }
    } catch (err) {
      alert('Failed to export exam results.');
    } finally {
      setExporting(null);
    }
  };

  const handleExportFees = async (format: 'csv' | 'xlsx' = 'csv') => {
    try {
      setExporting(`fees_${format}`);
      const data = await api.get('/fees/student-records');
      const headers = ['Admission Number', 'Student Name', 'Course/Program', 'Year', 'Fee Type', 'Total Dues (INR)', 'Paid Dues', 'Due Date', 'Status'];
      const keys = ['admission_number', 'student_name', 'course_name', 'year_number', 'fee_type', 'total_amount', 'paid_amount', 'due_date', 'status'];

      if (format === 'xlsx') {
        convertToExcel(data, headers, keys, `fees_ledger_export_${Date.now()}.xlsx`, 'Fees Ledger');
      } else {
        const csv = convertToCSV(data, headers, keys);
        downloadFile(csv, `fees_ledger_export_${Date.now()}.csv`);
      }
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
            <Users className="data-tools-Users-1" />
            <h3>Core Records</h3>
          </div>
          <p className="card-desc">Download complete register of all current students and teaching staff.</p>
          <div className="action-row">
            <button
              className="btn btn-outline"
              onClick={() => handleExportStudents('csv')}
              disabled={exporting !== null}
            >
              {exporting === 'students_csv' ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
              Students (CSV)
            </button>
            <button
              className="btn btn-outline"
              onClick={() => handleExportStudents('xlsx')}
              disabled={exporting !== null}
            >
              {exporting === 'students_xlsx' ? <Loader2 className="animate-spin" size={16} /> : <FileSpreadsheet size={16} />}
              Students (Excel)
            </button>
            <button
              className="btn btn-outline"
              onClick={() => handleExportTeachers('csv')}
              disabled={exporting !== null}
            >
              {exporting === 'teachers_csv' ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
              Teachers (CSV)
            </button>
            <button
              className="btn btn-outline"
              onClick={() => handleExportTeachers('xlsx')}
              disabled={exporting !== null}
            >
              {exporting === 'teachers_xlsx' ? <Loader2 className="animate-spin" size={16} /> : <FileSpreadsheet size={16} />}
              Teachers (Excel)
            </button>
          </div>
        </div>

        {/* Attendance Reports */}
        <div className="card export-card">
          <div className="card-header-icon">
            <FileSpreadsheet className="data-tools-FileSpreadsheet-2" />
            <h3>Class Attendance Registers</h3>
          </div>
          <p className="card-desc">Export overall session summary logs per student for a selected section.</p>
          
          <div className="export-dropdown-wrapper">
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              disabled={exporting !== null}
              className="export-select-input"
            >
              <option value="">-- Select Class Section --</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.name} (Year {s.year_number})</option>)}
            </select>
          </div>

          <div className="action-row">
            <button
              className="btn btn-outline"
              onClick={() => handleExportAttendance('csv')}
              disabled={exporting !== null || !selectedSectionId}
            >
              {exporting === 'attendance_csv' ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
              Attendance (CSV)
            </button>
            <button
              className="btn btn-outline"
              onClick={() => handleExportAttendance('xlsx')}
              disabled={exporting !== null || !selectedSectionId}
            >
              {exporting === 'attendance_xlsx' ? <Loader2 className="animate-spin" size={16} /> : <FileSpreadsheet size={16} />}
              Attendance (Excel)
            </button>
          </div>
        </div>

        {/* Exam Results */}
        <div className="card export-card">
          <div className="card-header-icon">
            <Award className="data-tools-Award-3" />
            <h3>Academic Performance Sheets</h3>
          </div>
          <p className="card-desc">Generate scorecards and student mark compilation spreadsheets for selected exam events.</p>
          
          <div className="export-dropdown-wrapper">
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              disabled={exporting !== null}
              className="export-select-input"
            >
              <option value="">-- Select Exam Event --</option>
              {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>

          <div className="action-row">
            <button
              className="btn btn-outline"
              onClick={() => handleExportResults('csv')}
              disabled={exporting !== null || !selectedExamId}
            >
              {exporting === 'results_csv' ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
              Results (CSV)
            </button>
            <button
              className="btn btn-outline"
              onClick={() => handleExportResults('xlsx')}
              disabled={exporting !== null || !selectedExamId}
            >
              {exporting === 'results_xlsx' ? <Loader2 className="animate-spin" size={16} /> : <FileSpreadsheet size={16} />}
              Results (Excel)
            </button>
          </div>
        </div>

        {/* Finance Records */}
        <div className="card export-card">
          <div className="card-header-icon">
            <IndianRupee className="data-tools-IndianRupee-4" />
            <h3>Finance &amp; Fee Ledgers</h3>
          </div>
          <p className="card-desc">Download student dues, collections, dates, and outstanding payment logs.</p>
          <div className="action-row">
            <button
              className="btn btn-outline"
              onClick={() => handleExportFees('csv')}
              disabled={exporting !== null}
            >
              {exporting === 'fees_csv' ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
              Fee Ledger (CSV)
            </button>
            <button
              className="btn btn-outline"
              onClick={() => handleExportFees('xlsx')}
              disabled={exporting !== null}
            >
              {exporting === 'fees_xlsx' ? <Loader2 className="animate-spin" size={16} /> : <FileSpreadsheet size={16} />}
              Fee Ledger (Excel)
            </button>
          </div>
        </div>
      </div>
    </>
  );

  const renderImport = () => (
    <>
      {/* Import Type Sub-Tabs */}
      <div className="import-sub-header">
        <span className="import-sub-title">Select Module to Import:</span>
        <div className="import-tabs">
          <button
            type="button"
            className={`tab-btn ${importTab === 'students' ? 'active' : ''}`}
            onClick={() => handleImportTabChange('students')}
            disabled={importLoading}
          >
            <FileSpreadsheet size={18} />
            Import Students
          </button>
          <button
            type="button"
            className={`tab-btn ${importTab === 'teachers' ? 'active' : ''}`}
            onClick={() => handleImportTabChange('teachers')}
            disabled={importLoading}
          >
            <FileSpreadsheet size={18} />
            Import Teachers
          </button>
          <button
            type="button"
            className={`tab-btn ${importTab === 'subjects' ? 'active' : ''}`}
            onClick={() => handleImportTabChange('subjects')}
            disabled={importLoading}
          >
            <FileSpreadsheet size={18} />
            Import Subjects
          </button>
        </div>
      </div>

      <div className="import-container">
        {/* CSV Format Guide */}
        <div className="card guide-card">
          <div className="guide-header">
            <HelpCircle size={20} className="data-tools-HelpCircle-5"  />
            <h3>CSV Formatting Requirements</h3>
          </div>
          <p>Your spreadsheet file must contain a header row matching the fields below (order does not matter):</p>

          <div className="headers-box">
            {currentTemplate.headers.map(h => <code key={h}>{h}</code>)}
          </div>

          <p className="data-tools-text-6">Example Row Sample:</p>
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
            <div className="alert alert-danger data-tools-alert">
              <AlertCircle size={18} />
              <span>{importError}</span>
            </div>
          )}

          {importResult && (
            <div className="alert alert-success data-tools-alert">
              <div className="data-tools-row-9">
                <CheckCircle2 size={18} />
                <span>Import completed successfully!</span>
              </div>
              <p className="data-tools-text-10">
                Imported: <strong>{importResult.imported}</strong> rows | Skipped/Errors: <strong>{importResult.skipped}</strong> rows
              </p>

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="error-log-box data-tools-error-log-box">
                  <strong>Error Logs:</strong>
                  <ul>
                    {importResult.errors.map((errStr: string, idx: number) => (
                      <li key={idx} className="data-tools-li-12">{errStr}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleUploadSubmit} className="upload-form">
            <div className="file-dropzone">
              <Upload size={32} className="data-tools-Upload-13"  />
              <p>{importFile ? `Selected file: ${importFile.name}` : 'Drag and drop or select a CSV spreadsheet'}</p>
              <label className="btn btn-outline data-tools-btn">
                Browse Files
                <input type="file" accept=".csv" onChange={handleFileChange} disabled={importLoading} className="data-tools-input-15"  />
              </label>
            </div>

            <button type="submit" className="btn btn-primary data-tools-btn" disabled={importLoading || !importFile}>
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
          <p className="data-tools-text-17">
            Export and import school data in CSV format
          </p>
        </div>
      </div>

      {/* Main Page Navigation Tabs */}
      <div className="data-tools-main-tabs">
        <button
          type="button"
          className={`data-tools-tab ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
        >
          <Download size={18} />
          <span>Export Data</span>
        </button>
        <button
          type="button"
          className={`data-tools-tab ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          <Upload size={18} />
          <span>Import Data</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'export' ? renderExport() : renderImport()}

      {/* Shared styles for both export and import sections */}
      
    </Layout>
  );
}
