import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Award, AlertCircle, Printer } from 'lucide-react';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../contexts/AuthContext';

interface Child {
  student_id: string;
  name: string;
}

interface Issuance {
  id: string;
  template_name: string;
  reference_number: string;
  issued_at: string;
  rendered_html: string;
}

// Read-only self-service view: a student sees their own issued certificates,
// a parent sees each child's. Reuses the same certificate_issuances rows
// (with the rendered_html snapshot taken at issue time) the staff-facing
// reprint flow already relies on - no separate rendering path to keep in sync.
export default function MyCertificates() {
  const { user } = useAuth();
  const isParent = (user?.roles || (user?.role ? [user.role] : [])).some((r) =>
    ['parent', 'Parent', 'guardian', 'Guardian'].includes(r)
  );

  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [issuances, setIssuances] = useState<Issuance[]>([]);
  const [selected, setSelected] = useState<Issuance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isParent) return;
    api.get('/dashboard/stats')
      .then((data) => {
        const kids: Child[] = data?.children || [];
        setChildren(kids);
        if (kids[0]) setSelectedChildId(kids[0].student_id);
      })
      .catch(() => setError('Could not load your linked children.'));
  }, [isParent]);

  useEffect(() => {
    let studentIdPromise: Promise<string | null>;
    if (isParent) {
      if (!selectedChildId) return;
      studentIdPromise = Promise.resolve(selectedChildId);
    } else {
      studentIdPromise = api.get('/dashboard/stats').then((d) => d?.studentInfo?.id || null);
    }

    setLoading(true);
    setError(null);
    studentIdPromise
      .then((studentId) => {
        if (!studentId) return [];
        return api.get(`/certificates/issuances/${studentId}`);
      })
      .then((data) => setIssuances(Array.isArray(data) ? data : []))
      .catch(() => setError('Could not load your certificates.'))
      .finally(() => setLoading(false));
  }, [isParent, selectedChildId]);

  return (
    <Layout>
      <div style={{ padding: '1.5rem', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <Award size={22} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
            {isParent ? "Child's Certificates" : 'My Certificates'}
          </h2>
        </div>

        {isParent && children.length > 1 && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {children.map((child) => (
              <button
                key={child.student_id}
                className="btn"
                onClick={() => setSelectedChildId(child.student_id)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: selectedChildId === child.student_id ? 'var(--primary)' : 'white',
                  color: selectedChildId === child.student_id ? 'white' : 'var(--text-main)',
                  fontWeight: 600,
                }}
              >
                {child.name}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="card" style={{ padding: '1rem', marginBottom: '1rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {loading ? (
          <SkeletonLoader />
        ) : isParent && children.length === 0 ? (
          <EmptyState
            icon={Award}
            title="No children linked"
            description="Contact your institution administration to link your parent account with your children."
          />
        ) : issuances.length === 0 ? (
          <EmptyState
            icon={Award}
            title="No certificates issued yet"
            description="Certificates issued by your institution will appear here."
          />
        ) : (
          <div className="card" style={{ padding: '1.25rem' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Certificate</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Reference No.</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Issued On</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {issuances.map((iss) => (
                  <tr key={iss.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600 }}>{iss.template_name}</td>
                    <td style={{ padding: '0.65rem 0.5rem' }}><code>{iss.reference_number}</code></td>
                    <td style={{ padding: '0.65rem 0.5rem' }}>{new Date(iss.issued_at).toLocaleDateString()}</td>
                    <td style={{ padding: '0.65rem 0.5rem' }}>
                      <button className="btn btn-sm btn-outline" onClick={() => setSelected(iss)}>
                        <Printer size={12} /> View &amp; Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selected && (
          <div className="modal-overlay" onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: 'var(--radius-md)', maxWidth: 800, width: '90%', maxHeight: '85vh', overflow: 'auto', padding: '1.5rem' }}>
              <div id="printable-certificate" dangerouslySetInnerHTML={{ __html: selected.rendered_html }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button className="btn btn-outline" onClick={() => setSelected(null)}>Close</button>
                <button className="btn btn-primary" onClick={() => window.print()}>
                  <Printer size={14} /> Print
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
