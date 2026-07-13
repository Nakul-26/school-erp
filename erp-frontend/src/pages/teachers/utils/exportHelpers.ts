import * as XLSX from 'xlsx';

export const exportHelpers = {
  exportTeachersExcel: (selectedTeachers: any[]) => {
    const data = selectedTeachers.map(t => ({
      'Employee ID': t.employee_id,
      'First Name': t.first_name,
      'Middle Name': t.middle_name || '',
      'Last Name': t.last_name || '',
      'Email': t.email || '',
      'Phone': t.phone || '',
      'Designation': t.designation || '',
      'Department': t.department || '',
      'Status': t.status,
      'Joining Date': t.joining_date || '',
      'Qualification': t.qualification || '',
      'Experience': t.experience || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Teachers Export');
    XLSX.writeFile(workbook, `Teachers_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  },

  exportTeachersCSV: (selectedTeachers: any[]) => {
    let csvContent = `Employee ID,First Name,Middle Name,Last Name,Email,Phone,Designation,Department,Status,Joining Date,Qualification,Experience\n`;
    
    selectedTeachers.forEach(t => {
      csvContent += `"${t.employee_id || ''}","${t.first_name || ''}","${t.middle_name || ''}","${t.last_name || ''}","${t.email || ''}","${t.phone || ''}","${t.designation || ''}","${t.department || ''}","${t.status || ''}","${t.joining_date || ''}","${t.qualification || ''}","${t.experience || ''}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `teachers_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
