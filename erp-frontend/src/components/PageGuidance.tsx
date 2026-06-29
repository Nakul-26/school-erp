import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface PageGuidanceProps {
  title: string;
  description: string;
  steps?: string[];
}

export const PageGuidance: React.FC<PageGuidanceProps> = ({ title, description, steps }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{
      backgroundColor: '#f0f7ff',
      borderLeft: '4px solid #2563eb',
      borderRadius: '8px',
      padding: '0.75rem 1rem',
      marginBottom: '1.25rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      fontFamily: 'inherit'
    }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e40af' }}>
          <HelpCircle size={18} style={{ color: '#2563eb' }} />
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Quick Guide: {title}</span>
        </div>
        <div style={{
          background: 'none',
          border: 'none',
          color: '#1e40af',
          cursor: 'pointer',
          padding: '0.25rem',
          display: 'flex',
          alignItems: 'center'
        }}>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {isOpen && (
        <div style={{ marginTop: '0.5rem', color: '#1e3a8a', fontSize: '0.85rem', lineHeight: '1.6' }}>
          <p style={{ margin: 0, fontWeight: 500 }}>{description}</p>
          {steps && steps.length > 0 && (
            <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.25rem', listStyleType: 'disc' }}>
              {steps.map((step, idx) => (
                <li key={idx} style={{ marginBottom: '0.25rem' }}>{step}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
