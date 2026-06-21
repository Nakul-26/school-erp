import React, { useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, HelpCircle, Loader2 } from 'lucide-react';

type ImportType = 'students' | 'teachers' | 'subjects';

export default function BulkImport() {
  const [activeTab, setActiveTab] = useState<ImportType>('students');
  const [file, setFile] = useState<File | null>(null);
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTabChange = (tab: ImportType) => {
    setActiveTab(tab);
    setFile(null);
    setResult(null);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setFile(files[0] || null);
      setResult(null);
      setError(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a CSV file to upload.');
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.upload(`/system/imports/${activeTab}`, formData);
      setResult(response);
      setFile(null);
    } catch (err: any) {
      setError(err.message || 'Failed to upload and import records.');
    } finally {
      setLoading(false);
    }
  };

  // Sample templates mapping
  const templates = {
    students: {
      headers: ['admission_number', 'first_name', 'last_name', 'gender', 'date_of_birth', 'email', 'phone', 'roll_number'],
      example: ['STU-2026-0001', 'Nakul', 'Kumar', 'Male', '2005-08-15', 'nakul@school.edu', '9876543210', '101']
    },
    teachers: {
      headers: ['employee_id', 'first_name', 'last_name', 'email', 'phone', 'joining_date', 'designation', 'department'],
      example: ['TCH-2026-0010', 'Ramesh', 'Sharma', 'ramesh@school.edu', '9123456789', '2024-06-01', 'Senior Lecturer', 'Computer Science']
    },
    subjects: {
      headers: ['course_code', 'subject_code', 'subject_name', 'credits', 'semester'],
      example: ['BE-CSE', 'CS301', 'Database Management Systems', '4', '5']
    }
  };

  const currentTemplate = templates[activeTab];

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2>Bulk Data Import Center</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Populate your ERP system instantly by uploading spreadsheet registers in CSV format.
          </p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="import-tabs">
        <button 
          className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => handleTabChange('students')}
          disabled={loading}
        >
          <FileSpreadsheet size={18} />
          Import Students
        </button>
        <button 
          className={`tab-btn ${activeTab === 'teachers' ? 'active' : ''}`}
          onClick={() => handleTabChange('teachers')}
          disabled={loading}
        >
          <FileSpreadsheet size={18} />
          Import Teachers
        </button>
        <button 
          className={`tab-btn ${activeTab === 'subjects' ? 'active' : ''}`}
          onClick={() => handleTabChange('subjects')}
          disabled={loading}
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
          
          {error && (
            <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                <CheckCircle2 size={18} />
                <span>Import completed successfully!</span>
              </div>
              <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                Imported: <strong>{result.imported}</strong> rows | Skipped/Errors: <strong>{result.skipped}</strong> rows
              </p>
              
              {result.errors && result.errors.length > 0 && (
                <div className="error-log-box" style={{ marginTop: '0.75rem' }}>
                  <strong>Error Logs:</strong>
                  <ul>
                    {result.errors.map((errStr: string, idx: number) => (
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
              <p>{file ? `Selected file: ${file.name}` : 'Drag and drop or select a CSV spreadsheet'}</p>
              <label className="btn btn-outline" style={{ marginTop: '0.75rem' }}>
                Browse Files
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleFileChange} 
                  disabled={loading}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading || !file}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem', width: 'fit-content' }}
            >
              {loading ? (
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

      <style>{`
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
