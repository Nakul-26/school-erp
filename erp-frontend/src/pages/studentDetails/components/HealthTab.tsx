import React from 'react';

interface HealthTabProps {
  student: any;
  canEditStudent: boolean;
  showHealthEdit: boolean;
  setShowHealthEdit: (v: boolean) => void;
  healthForm: { blood_group: string; emergency_contact: string; medical_notes: string };
  setHealthForm: React.Dispatch<React.SetStateAction<{ blood_group: string; emergency_contact: string; medical_notes: string }>>;
  savingHealth: boolean;
  onSave: (e: React.FormEvent) => void;
}

export function HealthTab({
  student, canEditStudent, showHealthEdit, setShowHealthEdit, healthForm, setHealthForm, savingHealth, onSave,
}: HealthTabProps) {
  return (
    <div>
      <div className="student-details-row-144">
        <h3 className="student-details-title-145">Student Health Profile</h3>
        {!showHealthEdit && canEditStudent && (
          <button className="btn btn-sm btn-outline" onClick={() => setShowHealthEdit(true)}>
            Edit Health Card
          </button>
        )}
      </div>

      {showHealthEdit && canEditStudent ? (
        <form onSubmit={onSave} className="student-details-form-146">
          <div className="form-group">
            <label>Blood Group</label>
            <select value={healthForm.blood_group} onChange={e => setHealthForm({ ...healthForm, blood_group: e.target.value })}>
              <option value="">-- Choose Blood Group --</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>
          <div className="form-group">
            <label>Emergency Contact Phone</label>
            <input type="text" value={healthForm.emergency_contact} onChange={e => setHealthForm({ ...healthForm, emergency_contact: e.target.value })} placeholder="e.g. +91 98765 43210 (Father)" />
          </div>
          <div className="form-group">
            <label>Medical Notes</label>
            <textarea value={healthForm.medical_notes} onChange={e => setHealthForm({ ...healthForm, medical_notes: e.target.value })} placeholder="e.g. Asthma, special instructions, etc." rows={2} />
          </div>

          <div className="student-details-row-147">
            <button type="submit" className="btn btn-primary btn-sm" disabled={savingHealth}>
              {savingHealth ? 'Saving...' : 'Save Health Card'}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowHealthEdit(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="student-details-grid-148">
          <div className="student-details-div-149">
            <span className="student-details-span-150">Blood Group</span>
            <strong className={`student-details-blood-val ${student.blood_group ? 'has-value' : ''}`}>
              {student.blood_group || 'Not Specified'}
            </strong>
          </div>
          <div className="student-details-div-151">
            <span className="student-details-span-152">Emergency Contact</span>
            <strong className="student-details-strong-153">
              {student.emergency_contact || 'None registered'}
            </strong>
          </div>
          <div className="student-details-div-154">
            <span className="student-details-span-155">Medical Notes</span>
            <p className="student-details-text-156">
              {student.medical_notes || 'No medical notes registered.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
