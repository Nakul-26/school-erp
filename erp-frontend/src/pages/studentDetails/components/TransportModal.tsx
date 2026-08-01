import React from 'react';

interface TransportModalProps {
  show: boolean;
  allocation: any;
  transportRoutes: any[];
  form: { route_id: string; pickup_point: string };
  setForm: React.Dispatch<React.SetStateAction<{ route_id: string; pickup_point: string }>>;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onRemove: () => void;
}

export function TransportModal({ show, allocation, transportRoutes, form, setForm, submitting, onClose, onSubmit, onRemove }: TransportModalProps) {
  if (!show) return null;
  return (
    <div className="modal student-details-modal">
      <div className="modal-content student-details-modal-content">
        <h3 className="student-details-title-233">
          {allocation ? 'Change Transport Route' : 'Assign Transport Route'}
        </h3>
        <form onSubmit={onSubmit}>

          <div className="form-group">
            <label>Select Transport Route *</label>
            <select
              value={form.route_id}
              onChange={e => setForm({ ...form, route_id: e.target.value })}
              required
            >
              <option value="">-- Choose Route --</option>
              {transportRoutes.map(route => (
                <option key={route.id} value={route.id}>
                  {route.route_name} (₹{route.monthly_charge}/mo, {route.vehicle_number})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group student-details-form-group">
            <label>Pickup / Drop Point Name (Optional)</label>
            <input
              type="text"
              value={form.pickup_point}
              onChange={e => setForm({ ...form, pickup_point: e.target.value })}
              placeholder="e.g. Main Gate, Sector 15 Cross"
            />
          </div>

          <div className="modal-actions student-details-modal-actions">
            {allocation ? (
              <button type="button" onClick={onRemove} className="btn btn-danger student-details-btn" disabled={submitting}>
                Remove Route
              </button>
            ) : <div />}

            <div className="student-details-row-237">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Save Assignment'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
