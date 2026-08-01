import React from 'react';
import { Eye, User, FileText } from 'lucide-react';
import type { BoardCard } from '../admissions.types';
import { getBadgeStyle } from '../utils';

interface OutcomeCardProps {
  card: BoardCard;
  onView: (card: BoardCard) => void;
}

export function OutcomeCard({ card, onView }: OutcomeCardProps) {
  const badge = getBadgeStyle(card.status);
  return (
    <div className="admissions-div-61">
      <div className="admissions-row-62">
        <span className="admissions-span-63">
          {card.classLabel}
        </span>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '4px', background: badge.bg, color: badge.color }}>
          {card.status}
        </span>
      </div>

      <h4 className="admissions-title-64">
        {card.title}
      </h4>

      <div className="admissions-col-65">
        <div className="admissions-row-66">
          <User size={12} className="admissions-User-67" />
          <span>{card.subtitle}</span>
        </div>
        <div className="admissions-row-68">
          <FileText size={12} className="admissions-FileText-69" />
          <span>Flow Type: <strong>{card.type.toUpperCase()}</strong></span>
        </div>
      </div>

      <div className="admissions-row-70">
        <button className="btn btn-sm btn-outline admissions-btn" onClick={() => onView(card)}>
          <Eye size={11} /> View Record
        </button>
      </div>
    </div>
  );
}
