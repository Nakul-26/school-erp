import React from 'react';

interface OverviewTabProps {
  student: any;
}

export function OverviewTab({ student }: OverviewTabProps) {
  return (
    <div>
      <h3 className="student-details-title-24">Personal Information</h3>
      <div className="student-details-grid-25">
        <div>
          <label className="student-details-label-26">First Name</label>
          <span className="student-details-span-27">{student.first_name}</span>
        </div>
        {student.middle_name && (
          <div>
            <label className="student-details-label-28">Middle Name</label>
            <span className="student-details-span-29">{student.middle_name}</span>
          </div>
        )}
        <div>
          <label className="student-details-label-30">Last Name</label>
          <span className="student-details-span-31">{student.last_name}</span>
        </div>
        <div>
          <label className="student-details-label-32">Admission No</label>
          <span className="student-details-span-33">{student.admission_number}</span>
        </div>
        <div>
          <label className="student-details-label-34">Roll No</label>
          <span className="student-details-span-35">{student.roll_number || '-'}</span>
        </div>
        <div>
          <label className="student-details-label-36">Email Address</label>
          <span className="student-details-span-37">{student.email || '-'}</span>
        </div>
        <div>
          <label className="student-details-label-38">Phone Number</label>
          <span className="student-details-span-39">{student.phone || '-'}</span>
        </div>
        <div>
          <label className="student-details-label-40">Gender</label>
          <span className="student-details-span-41">{student.gender || '-'}</span>
        </div>
        <div>
          <label className="student-details-label-42">Date of Birth</label>
          <span className="student-details-span-43">{student.date_of_birth || '-'}</span>
        </div>
        <div>
          <label className="student-details-label-44">Admission Date</label>
          <span className="student-details-span-45">{student.admission_date || '-'}</span>
        </div>
        <div className="student-details-address-col">
          <label className="student-details-label-44">Address</label>
          <span className="student-details-span-45 student-details-address-val">{student.address || '-'}</span>
        </div>
      </div>
    </div>
  );
}
