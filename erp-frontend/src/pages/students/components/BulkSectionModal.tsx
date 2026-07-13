import React from 'react';

interface BulkSectionModalProps {
  showBulkSectionModal: boolean;
  setShowBulkSectionModal: (show: boolean) => void;
  bulkSectionId: string;
  setBulkSectionId: (id: string) => void;
  sections: any[];
  handleBulkAction: (action: any, payload?: any) => Promise<void>;
}

export const BulkSectionModal: React.FC<BulkSectionModalProps> = ({
  showBulkSectionModal,
  setShowBulkSectionModal,
  bulkSectionId,
  setBulkSectionId,
  sections,
  handleBulkAction,
}) => {
  if (!showBulkSectionModal) return null;

  return (
    <div className="modal students-modal">
      <div className="modal-content students-modal-content size-sm">
        <h3 className="students-title-90">Bulk Section Assignment</h3>
        <div className="form-group">
          <label>Select Target Section</label>
          <select value={bulkSectionId} onChange={e => setBulkSectionId(e.target.value)}>
            <option value="">-- Choose Section --</option>
            {sections.map(s => (
              <option key={s.id} value={s.id}>{s.name} (Year {s.year_number})</option>
            ))}
          </select>
        </div>
        <div className="modal-actions students-bulk-modal-actions">
          <button type="button" onClick={() => setShowBulkSectionModal(false)} className="btn btn-secondary">Cancel</button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={() => handleBulkAction('assign_section', { section_id: bulkSectionId })} 
            disabled={!bulkSectionId}
          >
            Assign Section
          </button>
        </div>
      </div>
    </div>
  );
};
