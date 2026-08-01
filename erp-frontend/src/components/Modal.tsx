import './Modal.css';
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: number | string;
  closeOnOverlayClick?: boolean;
  footer?: React.ReactNode;
}

// Shared modal shell — extracted from the ~30 pages that each hand-rolled
// their own .modal-overlay/.modal-content markup. Uses sm- prefixed classes
// so it doesn't collide with the many pre-existing per-page .modal-* CSS
// rules still in use by not-yet-migrated pages.
export default function Modal({ isOpen, onClose, title, children, maxWidth = 650, closeOnOverlayClick = true, footer }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="sm-modal-overlay" onClick={closeOnOverlayClick ? onClose : undefined}>
      <div
        className="sm-modal-content"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {title !== undefined && (
          <div className="sm-modal-header">
            <h3 className="sm-modal-title">{title}</h3>
            <button type="button" className="sm-modal-close-btn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        )}
        <div className="sm-modal-body">{children}</div>
        {footer !== undefined && <div className="sm-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
