import React from 'react';
import { Eye, XCircle, CheckCircle, ChevronRight, User, Phone } from 'lucide-react';
import type { BoardCard } from '../admissions.types';
import { getBadgeStyle } from '../utils';

interface AppliedCardProps {
  card: BoardCard;
  onDragStart: (e: React.DragEvent, cardId: string, cardType: 'inquiry' | 'application') => void;
  onView: (item: any) => void;
  onReject: (item: any) => void;
  onApprove: (item: any) => void;
}

export function AppliedCard({ card, onDragStart, onView, onReject, onApprove }: AppliedCardProps) {
  const badge = getBadgeStyle(card.status);
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card.id, card.type)}
      className="admissions-div-40"
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.08)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}
    >
      <div className="admissions-row-41">
        <code className="admissions-code-42">
          {card.rawItem.application_number}
        </code>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '4px', background: badge.bg, color: badge.color }}>
          {card.status}
        </span>
      </div>

      <h4 className="admissions-title-43">
        {card.title}
      </h4>

      <div className="admissions-col-44">
        <div className="admissions-row-45">
          <ChevronRight size={11} className="admissions-ChevronRight-46" />
          <span>Applying Grade: <strong>{card.classLabel}</strong></span>
        </div>
        <div className="admissions-row-47">
          <User size={12} className="admissions-User-48" />
          <span>{card.subtitle}</span>
        </div>
        <div className="admissions-row-49">
          <Phone size={12} className="admissions-Phone-50" />
          <span>{card.phone}</span>
        </div>
      </div>

      <div className="admissions-row-51">
        <button className="btn btn-sm btn-outline admissions-btn" onClick={() => onView(card.rawItem)}>
          <Eye size={11} /> View App
        </button>

        <div className="admissions-row-53">
          <button className="btn btn-sm btn-outline admissions-btn" onClick={() => onReject(card.rawItem)}>
            <XCircle size={11} /> Reject
          </button>
          <button className="btn btn-sm admissions-btn" onClick={() => onApprove(card.rawItem)}>
            <CheckCircle size={11} /> Admit
          </button>
        </div>
      </div>
    </div>
  );
}
