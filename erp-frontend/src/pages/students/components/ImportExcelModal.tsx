import React from 'react';
import * as XLSX from 'xlsx';
import { studentService } from '../studentService';

interface ImportExcelModalProps {
  showImportModal: boolean;
  setShowImportModal: (show: boolean) => void;
  importing: boolean;
  setImporting: (importing: boolean) => void;
  importProgress: { current: number; total: number; successCount: number; errors: string[] } | null;
  setImportProgress: React.Dispatch<React.SetStateAction<{ current: number; total: number; successCount: number; errors: string[] } | null>>;
  programs: any[];
  sections: any[];
  academicYears: any[];
  fetchStudents: () => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  showImportModal,
  setShowImportModal,
  importing,
  setImporting,
  importProgress,
  setImportProgress,
  programs,
  sections,
  academicYears,
  fetchStudents,
  showToast,
}) => {
  if (!showImportModal) return null;

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Admission Number': 'ADM-001',
        'Roll Number': '101',
        'First Name': 'Rahul',
        'Middle Name': 'Kumar',
        'Last Name': 'Sharma',
        'Email': 'rahul@example.com',
        'Phone': '9876543210',
        'Gender': 'Male',
        'Date of Birth': '2012-05-15',
        'Address': '123 Park Street, City',
        'Status': 'ACTIVE',
        'Program': programs.length > 0 ? programs[0].name : 'Grade 8',
        'Section': sections.length > 0 ? sections[0].name : 'A',
        'Blood Group': 'O+',
        'Emergency Contact': '9876543211',
        'Medical Notes': 'None',
        'Guardian Name': 'Sanjay Sharma',
        'Guardian Relationship': 'Father',
        'Guardian Phone': '9876543212',
        'Guardian Email': 'sanjay@example.com'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students Template');
    XLSX.writeFile(workbook, 'Student_Import_Template.xlsx');
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

        let fallbackAcademicYearId = '';
        if (academicYears.length > 0) {
          fallbackAcademicYearId = academicYears[0].id;
        }

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowErrors: string[] = [];

          const firstName = row['First Name']?.toString().trim();
          const middleName = row['Middle Name']?.toString().trim();
          const lastName = row['Last Name']?.toString().trim();
          const admissionNumber = row['Admission Number']?.toString().trim();
          const rollNumber = row['Roll Number']?.toString().trim();
          const email = row['Email']?.toString().trim();
          const phone = row['Phone']?.toString().trim();
          const gender = row['Gender']?.toString().trim();
          const dateOfBirth = row['Date of Birth']?.toString().trim();
          const address = row['Address']?.toString().trim();
          const status = row['Status']?.toString().trim().toUpperCase();
          
          const guardianName = row['Guardian Name']?.toString().trim();
          const guardianRelationship = row['Guardian Relationship']?.toString().trim();
          const guardianPhone = row['Guardian Phone']?.toString().trim();
          const guardianEmail = row['Guardian Email']?.toString().trim();

          const nameRegex = /^[a-zA-Z\s.]+$/;
          const phoneRegex = /^[0-9+\s-]{8,15}$/;
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          const admRegex = /^[a-zA-Z0-9_\-\/]+$/;

          // 1. First Name validation
          if (!firstName) {
            rowErrors.push('First Name is missing');
          } else if (firstName.length < 2 || !nameRegex.test(firstName)) {
            rowErrors.push('First Name must be at least 2 chars and only letters');
          }

          // 2. Middle Name / Last Name validation
          if (middleName && !nameRegex.test(middleName)) {
            rowErrors.push('Middle Name must contain only letters');
          }
          if (lastName && !nameRegex.test(lastName)) {
            rowErrors.push('Last Name must contain only letters');
          }

          // 3. Admission Number validation
          if (!admissionNumber) {
            rowErrors.push('Admission Number is missing');
          } else if (admissionNumber.length < 3) {
            rowErrors.push('Admission Number must be at least 3 chars');
          } else if (!admRegex.test(admissionNumber)) {
            rowErrors.push('Admission Number must contain only alphanumeric, dash, underscore, or slash');
          }

          // 4. Roll Number validation
          if (!rollNumber) {
            rowErrors.push('Roll Number is missing');
          }

          // 5. Email validation
          if (email && !emailRegex.test(email)) {
            rowErrors.push('Email is invalid');
          }

          // 6. Phone validation
          if (phone && !phoneRegex.test(phone)) {
            rowErrors.push('Phone is invalid (8-15 digits)');
          }

          // 7. Gender validation
          if (gender && !['Male', 'Female', 'Other'].includes(gender)) {
            rowErrors.push('Gender must be Male, Female, or Other');
          }

          // 8. Date of Birth validation
          if (!dateOfBirth) {
            rowErrors.push('Date of Birth is missing');
          } else if (isNaN(Date.parse(dateOfBirth))) {
            rowErrors.push('Date of Birth is invalid date format');
          }

          // 9. Address validation
          if (!address) {
            rowErrors.push('Address is missing');
          }

          // 10. Status validation
          if (status && !['ACTIVE', 'APPLIED', 'ADMITTED', 'GRADUATED', 'TRANSFERRED', 'DROPPED', 'ALUMNI'].includes(status)) {
            rowErrors.push('Status is invalid');
          }

          // 11. Guardian Name validation
          if (!guardianName) {
            rowErrors.push('Guardian Name is missing');
          } else if (!nameRegex.test(guardianName)) {
            rowErrors.push('Guardian Name must contain only letters');
          }

          // 12. Guardian Relationship validation
          if (!guardianRelationship) {
            rowErrors.push('Guardian Relationship is missing');
          } else if (!['Father', 'Mother', 'Guardian', 'Other'].includes(guardianRelationship)) {
            rowErrors.push('Guardian Relationship must be Father, Mother, Guardian, or Other');
          }

          // 13. Guardian Phone validation
          if (!guardianPhone) {
            rowErrors.push('Guardian Phone is missing');
          } else if (!phoneRegex.test(guardianPhone)) {
            rowErrors.push('Guardian Phone is invalid (8-15 digits)');
          }

          // 14. Guardian Email validation
          if (guardianEmail && !emailRegex.test(guardianEmail)) {
            rowErrors.push('Guardian Email is invalid');
          }

          // 15. Program & Section validation
          const matchedProgram = programs.find(p => p.name.toLowerCase() === row['Program']?.toString().trim().toLowerCase());
          const matchedSection = sections.find(s => 
            s.name.toLowerCase() === row['Section']?.toString().trim().toLowerCase() &&
            (!matchedProgram || s.course_id === matchedProgram.id)
          );

          if (row['Program'] && !matchedProgram) {
            rowErrors.push(`Program "${row['Program']}" not found`);
          }
          if (row['Section'] && !matchedSection) {
            rowErrors.push(`Section "${row['Section']}" not found`);
          }

          if (rowErrors.length > 0) {
            errors.push(`Row ${i + 2} (${firstName || 'Unknown'}): ${rowErrors.join(', ')}`);
            setImportProgress(prev => prev ? { ...prev, current: i + 1, successCount: prev.successCount, errors: [...errors] } : null);
            continue;
          }

          const payload = {
            first_name: firstName,
            middle_name: middleName || null,
            last_name: lastName || '',
            admission_number: admissionNumber,
            roll_number: rollNumber,
            email: email || null,
            phone: phone || null,
            gender: gender || 'Male',
            date_of_birth: dateOfBirth || '2010-01-01',
            address: address || 'N/A',
            status: status || 'ACTIVE',
            blood_group: row['Blood Group']?.toString().trim() || null,
            emergency_contact: row['Emergency Contact']?.toString().trim() || null,
            medical_notes: row['Medical Notes']?.toString().trim() || null,
            course_id: matchedProgram?.id || null,
            section_id: matchedSection?.id || null,
            academic_year_id: fallbackAcademicYearId,
            guardian_name: guardianName || 'N/A',
            guardian_relationship: guardianRelationship || 'Father',
            guardian_phone: guardianPhone || '0000000000',
            guardian_email: guardianEmail || null
          };

          try {
            await studentService.createStudent(payload);
            successCount++;
          } catch (err: any) {
            const errMsg = err.message || 'Unknown error';
            errors.push(`Row ${i + 2} (${firstName}): ${errMsg}`);
          }

          setImportProgress(prev => prev ? { ...prev, current: i + 1, successCount, errors: [...errors] } : null);
        }

        showToast(`Successfully imported ${successCount} of ${rows.length} students.`);
        fetchStudents();
      } catch (err: any) {
        console.error(err);
        alert(`Failed to parse Excel file: ${err.message}`);
      } finally {
        setImporting(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="modal students-modal students-modal-overlay-import">
      <div className="modal-content students-modal-content size-md students-modal-content-import">
        <h3 className="students-modal-title">Bulk Student Import</h3>
        <p className="students-modal-desc">
          Import multiple student profiles directly from an Excel spreadsheet. Download the template to ensure your column headers are correct.
        </p>

        <div className="students-modal-header-actions">
          <button type="button" onClick={handleDownloadTemplate} className="btn btn-outline students-modal-btn-template">
            Download Template
          </button>
        </div>

        <div className="students-import-dragdrop">
          <span className="students-import-icon">📊</span>
          <span className="students-import-title">Upload Excel File (.xlsx, .xls)</span>
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            onChange={handleExcelImport} 
            disabled={importing} 
            className="students-import-input" 
          />
        </div>

        {importProgress && (
          <div className="students-import-progress-box">
            <div className="students-import-progress-header">
              <span>Import Progress</span>
              <span>{importProgress.current} / {importProgress.total} Rows</span>
            </div>
            <div className="students-import-progress-bar-bg">
              <div 
                className="students-import-progress-bar-fill" 
                style={{ '--progress-width': `${(importProgress.current / importProgress.total) * 100}%` } as React.CSSProperties} 
              />
            </div>
            
            <div className="students-import-success-text">
              Successfully Imported: {importProgress.successCount} {importProgress.successCount === 1 ? 'row' : 'rows'}
            </div>

            {importProgress.errors.length > 0 && (
              <div className="students-import-errors-container">
                <div className="students-import-errors-title">Import Warning / Issues:</div>
                <ul className="students-import-errors-list">
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

        <div className="modal-actions students-modal-footer-actions">
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
