import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Download, Users, UserCheck, FileSpreadsheet, Award, IndianRupee, Loader2 } from 'lucide-react';

export default function DataExport() {
  const [sections, setSections] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  
  // Selection states
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  
  // Loading states
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    fetchSelections();
  }, []);

  const fetchSelections = async () => {
    try {
      const [secData, examData] = await Promise.all([
        api.get('/sections').catch(() => []),
        api.get('/exams').catch(() => [])
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
        // Escape quotes
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
      // Results list has structures: student_id, name, roll_number, total_marks, percentage, subject_marks array, etc.
      // Let's dump the direct result summary card rows
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

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2>Data Export & Reporting Center</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Download spreadsheets of your institution's records for offline backup and administrative compilation.
          </p>
        </div>
      </div>

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
            <h3>Finance & Fee Ledgers</h3>
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

      <style>{`
        .export-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
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
