import React from 'react';
import { Phone, Mail } from 'lucide-react';

interface GuardiansTabProps {
  guardians: any[];
}

export function GuardiansTab({ guardians }: GuardiansTabProps) {
  return (
    <div>
      <div className="student-details-row-182">
        <h3 className="student-details-title-183">Family and Guardians</h3>
      </div>

      <div className="student-details-grid-184">
        {guardians.map((g, idx) => (
          <div key={g.id} className="card student-guardian-card">
            <div className="student-details-row-186">
              <span className="student-details-span-187">{idx === 0 ? 'Primary Contact' : 'Secondary Contact'}</span>
              <span className="badge badge-success student-details-badge">Active</span>
            </div>
            <div>
              <span className="student-details-span-189">Name</span>
              <strong className="student-details-strong-190">{g.name}</strong>
            </div>
            <div>
              <span className="student-details-span-191">Relationship</span>
              <span className="student-details-span-192">{g.relationship}</span>
            </div>
            <div>
              <span className="student-details-span-193">Phone</span>
              <span className="student-details-row-194">
                <Phone size={12} className="student-details-Phone-195" /> {g.phone || '-'}
              </span>
            </div>
            <div>
              <span className="student-details-span-196">Email</span>
              <span className="student-details-row-197">
                <Mail size={12} className="student-details-Mail-198" /> {g.email || '-'}
              </span>
            </div>
          </div>
        ))}
        {guardians.length === 0 && (
          <div className="student-details-div-199">
            <p className="student-details-text-200">No parents/guardians registered.</p>
          </div>
        )}
      </div>
    </div>
  );
}
