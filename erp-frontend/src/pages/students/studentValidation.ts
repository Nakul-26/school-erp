const NAME_REGEX = /^[a-zA-Z\s.]+$/;
const ADMISSION_NUMBER_REGEX = /^[a-zA-Z0-9_\-\/]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\s-]{8,15}$/;

export const studentValidation = {
  validateStep: (step: number, form: any): string | null => {
    if (step === 1) {
      if (!form.first_name || !form.admission_number || !form.date_of_birth || !form.gender || !form.address || !form.photo || !form.roll_number) {
        return 'Please fill in all required fields (First Name, Admission Number, Roll Number, Date of Birth, Gender, Address, Photo)';
      }
      
      const firstName = form.first_name.trim();
      const middleName = form.middle_name ? form.middle_name.trim() : '';
      const lastName = form.last_name ? form.last_name.trim() : '';
      const admissionNumber = form.admission_number.trim();
      const email = form.email ? form.email.trim() : '';
      const phone = form.phone ? form.phone.trim() : '';

      if (firstName.length < 2 || !NAME_REGEX.test(firstName)) {
        return 'First Name must be at least 2 characters and contain only letters.';
      }
      if (middleName && !NAME_REGEX.test(middleName)) {
        return 'Middle Name must contain only letters.';
      }
      if (lastName && !NAME_REGEX.test(lastName)) {
        return 'Last Name must contain only letters.';
      }
      if (admissionNumber.length < 3) {
        return 'Admission Number must be at least 3 characters.';
      }
      if (!ADMISSION_NUMBER_REGEX.test(admissionNumber)) {
        return 'Admission Number must contain only alphanumeric characters, dashes, underscores, or slashes.';
      }
      if (email && !EMAIL_REGEX.test(email)) {
        return 'Please enter a valid email address.';
      }
      if (phone && !PHONE_REGEX.test(phone)) {
        return 'Please enter a valid phone number (8-15 digits).';
      }
    }

    if (step === 2) {
      if (!form.academic_year_id || !form.course_id || !form.section_id) {
        return 'Please select the Academic Year, Program/Class, and Section';
      }
    }

    if (step === 3) {
      if (!form.guardians || form.guardians.length === 0) {
        return 'At least one guardian is required.';
      }
      for (let i = 0; i < form.guardians.length; i++) {
        const g = form.guardians[i];
        if (!g) continue;
        const gName = (g.name || '').trim();
        const gPhone = (g.phone || '').trim();
        const gEmail = g.email ? g.email.trim() : '';

        if (!gName || !g.relationship || !gPhone) {
          return `Guardian #${i + 1} Name, Relationship, and Phone Number are required.`;
        }
        if (!NAME_REGEX.test(gName)) {
          return `Guardian #${i + 1} Name must contain only letters.`;
        }
        if (gEmail && !EMAIL_REGEX.test(gEmail)) {
          return `Please enter a valid email for Guardian #${i + 1}.`;
        }
        if (!PHONE_REGEX.test(gPhone)) {
          return `Please enter a valid phone number for Guardian #${i + 1} (8-15 digits).`;
        }
      }
    }

    return null;
  },

  validateEdit: (form: any): string | null => {
    const firstName = form.first_name?.trim() || '';
    const middleName = form.middle_name ? form.middle_name.trim() : '';
    const lastName = form.last_name?.trim() || '';
    const admissionNumber = form.admission_number?.trim() || '';
    const email = form.email?.trim() || '';
    const phone = form.phone?.trim() || '';

    if (firstName.length < 2 || !NAME_REGEX.test(firstName)) {
      return 'First Name must be at least 2 characters and contain only letters.';
    }
    if (middleName && !NAME_REGEX.test(middleName)) {
      return 'Middle Name must contain only letters.';
    }
    if (lastName && !NAME_REGEX.test(lastName)) {
      return 'Last Name must contain only letters.';
    }
    if (admissionNumber.length < 3) {
      return 'Admission Number must be at least 3 characters.';
    }
    if (!ADMISSION_NUMBER_REGEX.test(admissionNumber)) {
      return 'Admission Number must contain only alphanumeric characters, dashes, underscores, or slashes.';
    }
    if (!form.date_of_birth) {
      return 'Date of Birth is required.';
    }
    if (!form.gender) {
      return 'Gender is required.';
    }
    if (!form.address || !form.address.trim()) {
      return 'Address is required.';
    }
    if (!form.photo) {
      return 'Student photo for ID Card is required.';
    }
    if (!form.roll_number || !form.roll_number.trim()) {
      return 'Roll Number is required.';
    }
    if (email && !EMAIL_REGEX.test(email)) {
      return 'Please enter a valid email address.';
    }
    if (phone && !PHONE_REGEX.test(phone)) {
      return 'Please enter a valid phone number (8-15 digits).';
    }

    // Validate guardians
    if (!form.guardians || form.guardians.length === 0) {
      return 'At least one guardian is required.';
    }
    for (let i = 0; i < form.guardians.length; i++) {
      const g = form.guardians[i];
      if (!g) continue;
      const gName = g.name?.trim() || '';
      const gPhone = g.phone?.trim() || '';
      const gEmail = g.email?.trim() || '';

      if (!gName || !g.relationship || !gPhone) {
        return `Guardian #${i + 1} Name, Relationship, and Phone Number are required.`;
      }
      if (!NAME_REGEX.test(gName)) {
        return `Guardian #${i + 1} Name must contain only letters.`;
      }
      if (gEmail && !EMAIL_REGEX.test(gEmail)) {
        return `Please enter a valid email for Guardian #${i + 1}.`;
      }
      if (!PHONE_REGEX.test(gPhone)) {
        return `Please enter a valid phone number for Guardian #${i + 1} (8-15 digits).`;
      }
    }

    return null;
  }
};
