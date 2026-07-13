import React from 'react';
import * as XLSX from 'xlsx';
import { teacherService } from '../teacherService';

interface ImportExcelModalProps {
  showImportModal: boolean;
  setShowImportModal: (show: boolean) => void;
  importing: boolean;
  setImporting: (importing: boolean) => void;
  importProgress: { current: number; total: number; successCount: number; errors: string[] } | null;
  setImportProgress: React.Dispatch<React.SetStateAction<{ current: number; total: number; successCount: number; errors: string[] } | null>>;
  departments: { id: string; name: string }[];
  fetchTeachers: () => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  showImportModal,
  setShowImportModal,
  importing,
  setImporting,
  importProgress,
  setImportProgress,
  departments,
  fetchTeachers,
  showToast,
}) => {
  if (!showImportModal) return null;

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Employee ID': 'EMP-001',
        'First Name': 'Jane',
        'Middle Name': '',
        'Last Name': 'Doe',
        'Email': 'jane.doe@school.com',
        'Phone': '9876543210',
        'Designation': 'Senior Teacher',
        'Department': departments[0]?.name || 'Science',
        'Status': 'ACTIVE',
        'Joining Date': '2026-07-01',
        'Qualification': 'M.Sc, B.Ed',
        'Experience': '5 Years'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Teachers Template');
    XLSX.writeFile(workbook, 'Teacher_Import_Template.xlsx');
  };

  const [isDragging, setIsDragging] = React.useState(false);

  const processFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setImporting(true);
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        if (!wsname) {
          alert('No sheets found in the Excel workbook.');
          setImporting(false);
          return;
        }
        const ws = wb.Sheets[wsname];
        if (!ws) {
          alert('Could not find the sheet in the Excel workbook.');
          setImporting(false);
          return;
        }
        const rows = XLSX.utils.sheet_to_json<any>(ws);

        if (rows.length === 0) {
          alert('No data found in the Excel sheet.');
          setImporting(false);
          return;
        }

        setImportProgress({ current: 0, total: rows.length, successCount: 0, errors: [] });
        
        let successCount = 0;
        const errors: string[] = [];

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowErrors: string[] = [];

          const employeeId = row['Employee ID']?.toString().trim();
          const firstName = row['First Name']?.toString().trim();
          const middleName = row['Middle Name']?.toString().trim();
          const lastName = row['Last Name']?.toString().trim();
          const email = row['Email']?.toString().trim();
          const phone = row['Phone']?.toString().trim();
          const designation = row['Designation']?.toString().trim();
          const department = row['Department']?.toString().trim();
          const status = row['Status']?.toString().trim().toUpperCase();
          const joiningDate = row['Joining Date']?.toString().trim();
          const qualification = row['Qualification']?.toString().trim();
          const experience = row['Experience']?.toString().trim();

          const nameRegex = /^[a-zA-Z\s.]+$/;
          const phoneRegex = /^[0-9+\s-]{8,15}$/;
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          const empIdRegex = /^[a-zA-Z0-9_\-\/]+$/;

          // 1. Employee ID validation
          if (!employeeId) {
            rowErrors.push('Employee ID is missing');
          } else if (employeeId.length < 3) {
            rowErrors.push('Employee ID must be at least 3 chars');
          } else if (!empIdRegex.test(employeeId)) {
            rowErrors.push('Employee ID must contain only alphanumeric, dash, underscore, or slash');
          }

          // 2. First Name validation
          if (!firstName) {
            rowErrors.push('First Name is missing');
          } else if (firstName.length < 2 || !nameRegex.test(firstName)) {
            rowErrors.push('First Name must be at least 2 chars and only letters');
          }

          // 3. Middle / Last Name validation
          if (middleName && !nameRegex.test(middleName)) {
            rowErrors.push('Middle Name must contain only letters');
          }
          if (!lastName) {
            rowErrors.push('Last Name is missing');
          } else if (lastName.length < 2 || !nameRegex.test(lastName)) {
            rowErrors.push('Last Name must be at least 2 chars and only letters');
          }

          // 4. Email validation
          if (!email) {
            rowErrors.push('Email is missing');
          } else if (!emailRegex.test(email)) {
            rowErrors.push('Email is invalid');
          }

          // 5. Phone validation
          if (phone && !phoneRegex.test(phone)) {
            rowErrors.push('Phone is invalid (8-15 digits)');
          }

          // 6. Status validation
          if (status && !['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'SUSPENDED'].includes(status)) {
            rowErrors.push('Status must be ACTIVE, INACTIVE, ON_LEAVE, or SUSPENDED');
          }

          // 7. Joining Date validation
          if (joiningDate && isNaN(Date.parse(joiningDate))) {
            rowErrors.push('Joining Date is invalid date format');
          }

          if (rowErrors.length > 0) {
            errors.push(`Row ${i + 2} (${firstName || 'Unknown'}): ${rowErrors.join(', ')}`);
            setImportProgress(prev => prev ? { ...prev, current: i + 1, successCount: prev.successCount, errors: [...errors] } : null);
            continue;
          }

          const payload = {
            employee_id: employeeId,
            first_name: firstName,
            middle_name: middleName || null,
            last_name: lastName,
            email: email,
            phone: phone || null,
            designation: designation || null,
            department: department || null,
            status: status || 'ACTIVE',
            joining_date: joiningDate || null,
            qualification: qualification || null,
            experience: experience || null,
            create_login: true
          };

          try {
            await teacherService.createTeacher(payload);
            successCount++;
          } catch (err: any) {
            const errMsg = err.message || 'Unknown error';
            errors.push(`Row ${i + 2} (${firstName}): ${errMsg}`);
          }

          setImportProgress(prev => prev ? { ...prev, current: i + 1, successCount, errors: [...errors] } : null);
        }

        showToast(`Successfully imported ${successCount} of ${rows.length} teachers.`);
        fetchTeachers();
      } catch (err: any) {
        console.error(err);
        alert(`Failed to parse Excel file: ${err.message}`);
      } finally {
        setImporting(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (importing) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'xlsx' && ext !== 'xls') {
        alert('Please upload an Excel file (.xlsx or .xls).');
        return;
      }
      processFile(file);
    }
  };

  return (
    <div className="modal teachers-modal teachers-modal-overlay-import">
      <div className="modal-content teachers-modal-content size-md teachers-modal-content-import">
        <h3 className="teachers-modal-title">Bulk Teacher Import</h3>
        <p className="teachers-modal-desc">
          Import multiple teacher profiles directly from an Excel spreadsheet. Download the template to ensure your column headers are correct.
        </p>

        <div className="teachers-modal-header-actions">
          <button type="button" onClick={handleDownloadTemplate} className="btn btn-outline teachers-modal-btn-template">
            Download Template
          </button>
        </div>

        <div 
          className={`teachers-import-dragdrop ${isDragging ? 'is-dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <span className="teachers-import-icon">📊</span>
          <span className="teachers-import-title">
            {isDragging ? 'Drop file here' : 'Drag & Drop or click to upload Excel File (.xlsx, .xls)'}
          </span>
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            onChange={handleExcelImport} 
            disabled={importing} 
            className="teachers-import-input" 
            aria-label="Upload Excel File for Teacher Import"
          />
        </div>

        {importProgress && (
          <div className="teachers-import-progress-box">
            <div className="teachers-import-progress-header">
              <span>Import Progress</span>
              <span>{importProgress.current} / {importProgress.total} Rows</span>
            </div>
            <div className="teachers-import-progress-bar-bg">
              <div 
                className="teachers-import-progress-bar-fill" 
                style={{ '--progress-width': `${(importProgress.current / importProgress.total) * 100}%` } as React.CSSProperties} 
              />
            </div>
            
            <div className="teachers-import-success-text">
              Successfully Imported: {importProgress.successCount} {importProgress.successCount === 1 ? 'row' : 'rows'}
            </div>

            {importProgress.errors.length > 0 && (
              <div className="teachers-import-errors-container">
                <div className="teachers-import-errors-title">Import Warning / Issues:</div>
                <ul className="teachers-import-errors-list">
                  {importProgress.errors.slice(0, 10).map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                  {importProgress.errors.length > 10 && (
                    <li>...and {importProgress.errors.length - 10} more errors</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="modal-actions teachers-modal-footer-actions">
          <button 
            type="button" 
            onClick={() => { setShowImportModal(false); setImportProgress(null); }} 
            className="btn btn-secondary"
            disabled={importing}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
