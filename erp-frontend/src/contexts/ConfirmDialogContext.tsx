import './ConfirmDialogContext.css';
import React, { createContext, useContext, useCallback, useState } from 'react';
import Modal from '../components/Modal';

export interface ConfirmOptions {
  title?: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  // If set, the confirm button stays disabled until the user types this
  // exact text — replaces the window.prompt("type DELETE to confirm") pattern.
  requireText?: string;
}

type ConfirmInput = string | ConfirmOptions;

interface ConfirmDialogContextType {
  confirm: (options: ConfirmInput) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | undefined>(undefined);

export const useConfirm = () => {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within a ConfirmDialogProvider');
  }
  return ctx.confirm;
};

interface PendingConfirm {
  opts: ConfirmOptions;
  resolve: (result: boolean) => void;
}

export const ConfirmDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [typedText, setTypedText] = useState('');

  const confirm = useCallback((options: ConfirmInput): Promise<boolean> => {
    const opts: ConfirmOptions = typeof options === 'string' ? { message: options } : options;
    setTypedText('');
    return new Promise<boolean>((resolve) => {
      setPending({ opts, resolve });
    });
  }, []);

  const settle = (result: boolean) => {
    pending?.resolve(result);
    setPending(null);
  };

  const canConfirm = !pending?.opts.requireText || typedText === pending.opts.requireText;

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      <Modal
        isOpen={pending !== null}
        onClose={() => settle(false)}
        title={pending?.opts.title || 'Confirm'}
        maxWidth={440}
        footer={
          <>
            <button type="button" className="confirm-dialog-btn confirm-dialog-btn-cancel" onClick={() => settle(false)}>
              {pending?.opts.cancelLabel || 'Cancel'}
            </button>
            <button
              type="button"
              className={`confirm-dialog-btn ${pending?.opts.danger ? 'confirm-dialog-btn-danger' : 'confirm-dialog-btn-primary'}`}
              disabled={!canConfirm}
              onClick={() => settle(true)}
            >
              {pending?.opts.confirmLabel || 'Confirm'}
            </button>
          </>
        }
      >
        <p className="confirm-dialog-message">{pending?.opts.message}</p>
        {pending?.opts.requireText && (
          <input
            type="text"
            autoFocus
            className="confirm-dialog-input"
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            placeholder={`Type ${pending.opts.requireText} to confirm`}
          />
        )}
      </Modal>
    </ConfirmDialogContext.Provider>
  );
};
