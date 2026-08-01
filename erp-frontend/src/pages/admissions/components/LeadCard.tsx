import React from 'react';
import { Eye, ArrowRight, User, Phone } from 'lucide-react';
import type { BoardCard } from '../admissions.types';
import { getBadgeStyle } from '../utils';

interface LeadCardProps {
  card: BoardCard;
  onDragStart: (e: React.DragEvent, cardId: string, cardType: 'inquiry' | 'application') => void;
  onDetail: (item: any) => void;
  onMarkContacted: (id: string) => void;
  onConvert: (item: any) => void;
}

export function LeadCard({ card, onDragStart, onDetail, onMarkContacted, onConvert }: LeadCardProps) {
  const badge = getBadgeStyle(card.status);
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card.id, card.type)}
      className="admissions-div-21"
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.08)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}
    >
      <div className="admissions-row-22">
        <span className="admissions-span-23">
          {card.classLabel}
        </span>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '4px', background: badge.bg, color: badge.color }}>
          {card.status}
        </span>
      </div>

      <h4 className="admissions-title-24">
        {card.title}
      </h4>

      <div className="admissions-col-25">
        <div className="admissions-row-26">
          <User size={12} className="admissions-User-27" />
          <span>{card.subtitle}</span>
        </div>
        <div className="admissions-row-28">
          <Phone size={12} className="admissions-Phone-29" />
          <span>{card.phone}</span>
        </div>
      </div>

      <div className="admissions-row-30">
        <button className="btn btn-sm btn-outline admissions-btn" onClick={() => onDetail(card.rawItem)}>
          <Eye size={11} /> Details
        </button>

        <div className="admissions-row-32">
          {card.status === 'New' && (
            <button className="btn btn-sm admissions-btn" onClick={() => onMarkContacted(card.id)}>
              Mark Called
            </button>
          )}
          <button className="btn btn-sm btn-primary admissions-btn" onClick={() => onConvert(card.rawItem)}>
            Convert <ArrowRight size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}
