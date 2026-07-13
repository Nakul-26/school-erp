import React from 'react';

interface BulkDepartmentModalProps {
  showBulkDeptModal: boolean;
  setShowBulkDeptModal: (show: boolean) => void;
  bulkDeptName: string;
  setBulkDeptName: (name: string) => void;
  departments: { id: string; name: string }[];
  handleBulkAction: (action: 'assign_department', payload?: { department: string }) => Promise<void>;
}

export const BulkDepartmentModal: React.FC<BulkDepartmentModalProps> = ({
  showBulkDeptModal,
  setShowBulkDeptModal,
  bulkDeptName,
  setBulkDeptName,
  departments,
  handleBulkAction,
}) => {
  if (!showBulkDeptModal) return null;

  return (
    <div className="modal teachers-modal">
      <div className="modal-content teachers-modal-content size-sm">
        <h3 className="teachers-title-bulk-dept">Bulk Department Assignment</h3>
        <div className="form-group">
          <label htmlFor="bulk-dept-select">Select Target Department</label>
          <select 
            id="bulk-dept-select"
            aria-label="Select Target Department"
            value={bulkDeptName} 
            onChange={e => setBulkDeptName(e.target.value)}
          >
            <option value="">-- Choose Department --</option>
            {departments.map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>
        <div className="modal-actions teachers-bulk-modal-actions">
          <button type="button" onClick={() => setShowBulkDeptModal(false)} className="btn btn-secondary">Cancel</button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={() => handleBulkAction('assign_department', { department: bulkDeptName })} 
            disabled={!bulkDeptName}
          >
            Assign Department
          </button>
        </div>
      </div>
    </div>
  );
};
