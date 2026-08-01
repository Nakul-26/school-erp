import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Company } from '../placements.types';

interface CompaniesPanelProps {
  loading: boolean;
  companies: Company[];
  onAddClick: () => void;
  onDelete: (company: Company) => void;
}

export function CompaniesPanel({ loading, companies, onAddClick, onDelete }: CompaniesPanelProps) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button type="button" className="btn btn-primary" onClick={onAddClick}>
          <Plus size={16} /> Add Company
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading companies...</p>
      ) : companies.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No recruiting companies added yet.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Industry</th>
              <th>Contact Person</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map(c => (
              <tr key={c.id}>
                <td><strong>{c.name}</strong></td>
                <td>{c.industry || '-'}</td>
                <td>{c.contact_person || '-'}</td>
                <td>{c.contact_email || '-'}</td>
                <td>{c.contact_phone || '-'}</td>
                <td>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => onDelete(c)}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
