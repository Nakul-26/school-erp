import React from 'react';
import { Trash2 } from 'lucide-react';
import type { MedicalSummary } from '../studentDetails.types';

interface VisitFormState { visit_date: string; reason: string; diagnosis: string; treatment: string; follow_up_date: string }
interface ImmunizationFormState { vaccine_name: string; dose_number: string; administered_date: string; next_due_date: string }
interface IncidentFormState { incident_date: string; incident_type: string; description: string; severity: string; action_taken: string; parent_notified: boolean }

interface HealthTabProps {
  student: any;
  canEditStudent: boolean;
  showHealthEdit: boolean;
  setShowHealthEdit: (v: boolean) => void;
  healthForm: { blood_group: string; emergency_contact: string; medical_notes: string };
  setHealthForm: React.Dispatch<React.SetStateAction<{ blood_group: string; emergency_contact: string; medical_notes: string }>>;
  savingHealth: boolean;
  onSave: (e: React.FormEvent) => void;

  canManageMedical: boolean;
  medicalSummary: MedicalSummary | null;
  medicalLoading: boolean;

  visitForm: VisitFormState;
  setVisitForm: React.Dispatch<React.SetStateAction<VisitFormState>>;
  onAddVisit: (e: React.FormEvent) => void;
  onDeleteVisit: (id: string) => void;

  immunizationForm: ImmunizationFormState;
  setImmunizationForm: React.Dispatch<React.SetStateAction<ImmunizationFormState>>;
  onAddImmunization: (e: React.FormEvent) => void;
  onDeleteImmunization: (id: string) => void;

  incidentForm: IncidentFormState;
  setIncidentForm: React.Dispatch<React.SetStateAction<IncidentFormState>>;
  onAddIncident: (e: React.FormEvent) => void;
  onDeleteIncident: (id: string) => void;
}

export function HealthTab({
  student, canEditStudent, showHealthEdit, setShowHealthEdit, healthForm, setHealthForm, savingHealth, onSave,
  canManageMedical, medicalSummary, medicalLoading,
  visitForm, setVisitForm, onAddVisit, onDeleteVisit,
  immunizationForm, setImmunizationForm, onAddImmunization, onDeleteImmunization,
  incidentForm, setIncidentForm, onAddIncident, onDeleteIncident,
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

      {medicalLoading ? (
        <p className="student-details-text-118" style={{ marginTop: '1.5rem' }}>Loading medical history...</p>
      ) : (
        <>
          {/* Health Visit Log */}
          <div style={{ marginTop: '2rem' }}>
            <h3 className="student-details-title-145">Health Visit Log</h3>
            {canManageMedical && (
              <form onSubmit={onAddVisit} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                <input type="date" value={visitForm.visit_date} onChange={e => setVisitForm({ ...visitForm, visit_date: e.target.value })} style={{ maxWidth: '160px' }} />
                <input type="text" placeholder="Reason for visit *" value={visitForm.reason} onChange={e => setVisitForm({ ...visitForm, reason: e.target.value })} required style={{ flex: 1, minWidth: '160px' }} />
                <input type="text" placeholder="Diagnosis" value={visitForm.diagnosis} onChange={e => setVisitForm({ ...visitForm, diagnosis: e.target.value })} style={{ flex: 1, minWidth: '140px' }} />
                <input type="text" placeholder="Treatment" value={visitForm.treatment} onChange={e => setVisitForm({ ...visitForm, treatment: e.target.value })} style={{ flex: 1, minWidth: '140px' }} />
                <input type="date" title="Follow-up date" value={visitForm.follow_up_date} onChange={e => setVisitForm({ ...visitForm, follow_up_date: e.target.value })} style={{ maxWidth: '160px' }} />
                <button type="submit" className="btn btn-primary btn-sm">Log Visit</button>
              </form>
            )}
            {(medicalSummary?.visits.length || 0) === 0 ? (
              <p className="student-details-text-118">No infirmary/health visits recorded.</p>
            ) : (
              <table className="table">
                <thead><tr><th>Date</th><th>Reason</th><th>Diagnosis</th><th>Treatment</th><th>Follow-up</th>{canManageMedical && <th></th>}</tr></thead>
                <tbody>
                  {medicalSummary!.visits.map(v => (
                    <tr key={v.id}>
                      <td>{v.visit_date}</td>
                      <td>{v.reason}</td>
                      <td>{v.diagnosis || '-'}</td>
                      <td>{v.treatment || '-'}</td>
                      <td>{v.follow_up_date || '-'}</td>
                      {canManageMedical && (
                        <td><button onClick={() => onDeleteVisit(v.id)} className="student-details-btn-167"><Trash2 size={14} /></button></td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Immunizations */}
          <div style={{ marginTop: '2rem' }}>
            <h3 className="student-details-title-145">Immunization Records</h3>
            {canManageMedical && (
              <form onSubmit={onAddImmunization} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                <input type="text" placeholder="Vaccine name *" value={immunizationForm.vaccine_name} onChange={e => setImmunizationForm({ ...immunizationForm, vaccine_name: e.target.value })} required style={{ flex: 1, minWidth: '160px' }} />
                <input type="number" min={1} placeholder="Dose #" value={immunizationForm.dose_number} onChange={e => setImmunizationForm({ ...immunizationForm, dose_number: e.target.value })} style={{ maxWidth: '90px' }} />
                <input type="date" title="Administered date" value={immunizationForm.administered_date} onChange={e => setImmunizationForm({ ...immunizationForm, administered_date: e.target.value })} style={{ maxWidth: '160px' }} />
                <input type="date" title="Next due date" value={immunizationForm.next_due_date} onChange={e => setImmunizationForm({ ...immunizationForm, next_due_date: e.target.value })} style={{ maxWidth: '160px' }} />
                <button type="submit" className="btn btn-primary btn-sm">Add Record</button>
              </form>
            )}
            {(medicalSummary?.immunizations.length || 0) === 0 ? (
              <p className="student-details-text-118">No immunization records.</p>
            ) : (
              <table className="table">
                <thead><tr><th>Vaccine</th><th>Dose</th><th>Administered</th><th>Next Due</th>{canManageMedical && <th></th>}</tr></thead>
                <tbody>
                  {medicalSummary!.immunizations.map(im => (
                    <tr key={im.id}>
                      <td>{im.vaccine_name}</td>
                      <td>{im.dose_number ?? '-'}</td>
                      <td>{im.administered_date || '-'}</td>
                      <td>{im.next_due_date || '-'}</td>
                      {canManageMedical && (
                        <td><button onClick={() => onDeleteImmunization(im.id)} className="student-details-btn-167"><Trash2 size={14} /></button></td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Health Incidents */}
          <div style={{ marginTop: '2rem' }}>
            <h3 className="student-details-title-145">Incident Reports</h3>
            {canManageMedical && (
              <form onSubmit={onAddIncident} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
                <input type="date" value={incidentForm.incident_date} onChange={e => setIncidentForm({ ...incidentForm, incident_date: e.target.value })} style={{ maxWidth: '160px' }} />
                <select value={incidentForm.incident_type} onChange={e => setIncidentForm({ ...incidentForm, incident_type: e.target.value })}>
                  <option value="INJURY">Injury</option>
                  <option value="ILLNESS">Illness</option>
                  <option value="ALLERGY_REACTION">Allergy Reaction</option>
                  <option value="OTHER">Other</option>
                </select>
                <select value={incidentForm.severity} onChange={e => setIncidentForm({ ...incidentForm, severity: e.target.value })}>
                  <option value="MINOR">Minor</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="SEVERE">Severe</option>
                </select>
                <input type="text" placeholder="Description *" value={incidentForm.description} onChange={e => setIncidentForm({ ...incidentForm, description: e.target.value })} required style={{ flex: 1, minWidth: '160px' }} />
                <input type="text" placeholder="Action taken" value={incidentForm.action_taken} onChange={e => setIncidentForm({ ...incidentForm, action_taken: e.target.value })} style={{ flex: 1, minWidth: '140px' }} />
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                  <input type="checkbox" checked={incidentForm.parent_notified} onChange={e => setIncidentForm({ ...incidentForm, parent_notified: e.target.checked })} />
                  Parent notified
                </label>
                <button type="submit" className="btn btn-primary btn-sm">Log Incident</button>
              </form>
            )}
            {(medicalSummary?.incidents.length || 0) === 0 ? (
              <p className="student-details-text-118">No health incidents recorded.</p>
            ) : (
              <table className="table">
                <thead><tr><th>Date</th><th>Type</th><th>Severity</th><th>Description</th><th>Action Taken</th><th>Parent Notified</th>{canManageMedical && <th></th>}</tr></thead>
                <tbody>
                  {medicalSummary!.incidents.map(inc => (
                    <tr key={inc.id}>
                      <td>{inc.incident_date}</td>
                      <td>{inc.incident_type}</td>
                      <td>
                        <span className={`badge badge-${inc.severity === 'SEVERE' ? 'danger' : inc.severity === 'MODERATE' ? 'warning' : 'info'}`}>{inc.severity}</span>
                      </td>
                      <td>{inc.description}</td>
                      <td>{inc.action_taken || '-'}</td>
                      <td>{inc.parent_notified ? 'Yes' : 'No'}</td>
                      {canManageMedical && (
                        <td><button onClick={() => onDeleteIncident(inc.id)} className="student-details-btn-167"><Trash2 size={14} /></button></td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
