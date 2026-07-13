const NAME_REGEX = /^[a-zA-Z\s.]+$/;
const EMP_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\s-]{8,15}$/;

export const teacherValidation = {
  validateStep: (step: number, form: any): string | null => {
    if (step === 1) {
      const firstName = (form.first_name || '').trim();
      const middleName = form.middle_name ? form.middle_name.trim() : '';
      const lastName = (form.last_name || '').trim();
      const email = form.email ? form.email.trim() : '';
      const phone = form.phone ? form.phone.trim() : '';

      if (!firstName || !lastName) {
        return 'First Name and Last Name are required.';
      }
      if (firstName.length < 2 || !NAME_REGEX.test(firstName)) {
        return 'First Name must be at least 2 characters and contain only letters.';
      }
      if (middleName && !NAME_REGEX.test(middleName)) {
        return 'Middle Name must contain only letters.';
      }
      if (lastName.length < 1 || !NAME_REGEX.test(lastName)) {
        return 'Last Name must be at least 1 character and contain only letters.';
      }
      if (email && !EMAIL_REGEX.test(email)) {
        return 'Please enter a valid email address.';
      }
      if (phone && !PHONE_REGEX.test(phone)) {
        return 'Please enter a valid phone number (8-15 digits).';
      }
    }

    if (step === 2) {
      const employeeId = (form.employee_id || '').trim();
      if (!employeeId || !form.department) {
        return 'Employee ID and Department are required.';
      }
      if (employeeId.length < 3) {
        return 'Employee ID must be at least 3 characters long.';
      }
      if (!EMP_ID_REGEX.test(employeeId)) {
        return 'Employee ID must contain only alphanumeric characters, dashes, or underscores.';
      }
    }

    return null;
  },

  validateEdit: (form: any): string | null => {
    const firstName = (form.first_name || '').trim();
    const middleName = form.middle_name ? form.middle_name.trim() : '';
    const lastName = (form.last_name || '').trim();
    const employeeId = (form.employee_id || '').trim();
    const email = form.email ? form.email.trim() : '';

    if (!firstName || !lastName) {
      return 'First Name and Last Name are required.';
    }
    if (firstName.length < 2 || !NAME_REGEX.test(firstName)) {
      return 'First Name must be at least 2 characters and contain only letters.';
    }
    if (middleName && !NAME_REGEX.test(middleName)) {
      return 'Middle Name must contain only letters.';
    }
    if (lastName.length < 1 || !NAME_REGEX.test(lastName)) {
      return 'Last Name must be at least 1 character and contain only letters.';
    }
    if (!employeeId) {
      return 'Employee ID is required.';
    }
    if (employeeId.length < 3) {
      return 'Employee ID must be at least 3 characters long.';
    }
    if (!EMP_ID_REGEX.test(employeeId)) {
      return 'Employee ID must contain only alphanumeric characters, dashes, or underscores.';
    }
    if (email && !EMAIL_REGEX.test(email)) {
      return 'Please enter a valid email address.';
    }
    if (!form.department) {
      return 'Please select a valid department.';
    }

    return null;
  }
};
