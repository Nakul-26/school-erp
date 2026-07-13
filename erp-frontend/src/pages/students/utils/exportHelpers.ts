import * as XLSX from 'xlsx';

export const exportHelpers = {
  exportStudentsExcel: (selectedStudents: any[]) => {
    const data = selectedStudents.map(s => ({
      'Admission Number': s.admission_number,
      'Roll Number': s.roll_number || '',
      'First Name': s.first_name,
      'Middle Name': s.middle_name || '',
      'Last Name': s.last_name || '',
      'Email': s.email || '',
      'Phone': s.phone || '',
      'Gender': s.gender,
      'Date of Birth': s.date_of_birth,
      'Address': s.address || '',
      'Status': s.status,
      'Program': s.program_name || '',
      'Section': s.section_name || '',
      'Blood Group': s.blood_group || '',
      'Emergency Contact': s.emergency_contact || '',
      'Medical Notes': s.medical_notes || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students Export');
    XLSX.writeFile(workbook, `Students_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  },

  exportStudentsCSV: (selectedStudents: any[], getProgramLabel: () => string) => {
    let csvContent = `Admission Number,Roll Number,First Name,Last Name,Email,Phone,${getProgramLabel()},Section,Status,Attendance Rate,Fee Due,Blood Group,Emergency Contact,Medical Notes\n`;
    
    selectedStudents.forEach(s => {
      csvContent += `"${s.admission_number || ''}","${s.roll_number || ''}","${s.first_name || ''}","${s.last_name || ''}","${s.email || ''}","${s.phone || ''}","${s.program_name || ''}","${s.section_name || ''}","${s.status || ''}","${s.attendance_percentage || 100}%","${s.fee_due || 0}","${s.blood_group || ''}","${s.emergency_contact || ''}","${(s.medical_notes || '').replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `students_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
