import React from 'react';
import { X, Printer, QrCode, ShieldCheck, User } from 'lucide-react';

interface StudentIDCardModalProps {
  student: any;
  institutionName?: string;
  onClose: () => void;
}

export const StudentIDCardModal: React.FC<StudentIDCardModalProps> = ({
  student,
  institutionName = 'Oxford Educational Institution',
  onClose
}) => {
  if (!student) return null;

  const handlePrint = () => {
    window.print();
  };

  const fullName = `${student.first_name} ${student.middle_name || ''} ${student.last_name || ''}`.replace(/\s+/g, ' ').trim();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)',
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        maxWidth: '480px',
        width: '100%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden'
      }}>
        {/* Header toolbar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={20} style={{ color: '#2563eb' }} /> Student ID Card Preview
          </h3>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* ID Card Display Container */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div id="printable-id-card" style={{
            width: '340px',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            position: 'relative'
          }}>
            {/* Institution Header Banner */}
            <div style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
              color: '#ffffff',
              padding: '1rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8, fontWeight: 600 }}>
                STUDENT IDENTIFICATION
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, marginTop: '2px', lineHeight: 1.2 }}>
                {institutionName}
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '1.25rem 1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Photo */}
              <div style={{
                width: '90px',
                height: '90px',
                borderRadius: '50%',
                backgroundColor: '#e2e8f0',
                border: '3px solid #ffffff',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden',
                marginTop: '-35px',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {student.photo ? (
                  <img src={student.photo} alt={fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={45} style={{ color: '#94a3b8' }} />
                )}
              </div>

              {/* Student Name */}
              <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                {fullName}
              </h4>
              <div style={{
                display: 'inline-block',
                padding: '0.2rem 0.6rem',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                marginBottom: '1rem'
              }}>
                {student.program_name || student.course_name || 'Student'} {student.section_name ? `- Section ${student.section_name}` : ''}
              </div>

              {/* Grid Metadata */}
              <div style={{
                width: '100%',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem',
                fontSize: '0.8rem',
                textAlign: 'left',
                backgroundColor: '#f8fafc',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #f1f5f9',
                marginBottom: '1rem'
              }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>Admission No</span>
                  <strong style={{ color: '#0f172a' }}>{student.admission_number}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>Roll Number</span>
                  <strong style={{ color: '#0f172a' }}>{student.roll_number || 'N/A'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>Blood Group</span>
                  <strong style={{ color: '#dc2626' }}>{student.blood_group || 'N/A'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>Status</span>
                  <strong style={{ color: student.is_active ? '#16a34a' : '#64748b' }}>{student.status || 'ACTIVE'}</strong>
                </div>
              </div>

              {/* QR Representation & Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingTop: '0.5rem', borderTop: '1px dashed #cbd5e1' }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Academic Year</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>{student.academic_year_name || '2025-26'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#64748b' }}>
                  <QrCode size={36} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div style={{
          padding: '1rem 1.25rem',
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem'
        }}>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="btn btn-primary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Printer size={16} /> Print ID Card
          </button>
        </div>
      </div>
    </div>
  );
};
