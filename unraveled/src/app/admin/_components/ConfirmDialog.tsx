'use client';

import React, { useState, useEffect, useRef } from 'react';

type DialogVariant = 'info' | 'confirm' | 'destructive' | 'form';

interface ConfirmDialogProps {
  open: boolean;
  variant?: DialogVariant;
  title: string;
  body?: React.ReactNode;
  /** For destructive variant: the ID/name the user must type to confirm */
  confirmValue?: string;
  /** For form variant: label and placeholder for the input */
  inputLabel?: string;
  inputPlaceholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (inputValue?: string) => void;
  onCancel: () => void;
}

/**
 * Replaces window.confirm() and window.prompt().
 *
 * Variants:
 *   info        — acknowledgement only (single "OK" button)
 *   confirm     — confirm / cancel
 *   destructive — confirm / cancel + must type confirmValue (e.g. session ID) + checkbox
 *   form        — confirm / cancel + freeform text input (replaces window.prompt)
 */
export function ConfirmDialog({
  open,
  variant = 'confirm',
  title,
  body,
  confirmValue,
  inputLabel,
  inputPlaceholder,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('');
  const [checked, setChecked] = useState(false);
  const [formValue, setFormValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTyped('');
      setChecked(false);
      setFormValue('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  const isDestructive = variant === 'destructive';
  const isForm = variant === 'form';
  const isInfo = variant === 'info';

  const destructiveReady =
    isDestructive
      ? typed === confirmValue && checked
      : true;

  const canConfirm = destructiveReady;

  function handleConfirm() {
    if (!canConfirm) return;
    onConfirm(isForm ? formValue : undefined);
    setTyped('');
    setChecked(false);
    setFormValue('');
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(20,14,8,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      {/* Panel */}
      <div
        className="w-full max-w-sm mx-4 rounded border border-border bg-ground shadow-lg"
        style={{ padding: '24px' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        {/* Title */}
        <p
          id="confirm-dialog-title"
          className="font-serif text-base text-text-primary"
        >
          {title}
        </p>

        {/* Body */}
        {body && (
          <div
            className="mt-2"
            style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}
          >
            {body}
          </div>
        )}

        {/* Destructive: type-to-confirm */}
        {isDestructive && confirmValue && (
          <div className="mt-4 space-y-3">
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-tertiary)' }}>
              Type <strong style={{ color: 'var(--status-failed)' }}>{confirmValue}</strong> to confirm:
            </p>
            <input
              ref={inputRef}
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="w-full bg-transparent rounded border border-border px-3 py-2 text-text-primary focus:outline-none focus:border-gold"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}
              placeholder={confirmValue}
              onKeyDown={(e) => { if (e.key === 'Enter' && canConfirm) handleConfirm(); }}
            />
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="mt-0.5"
              />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-tertiary)' }}>
                I understand this action cannot be undone.
              </span>
            </label>
          </div>
        )}

        {/* Form: freeform input */}
        {isForm && (
          <div className="mt-4 space-y-1">
            {inputLabel && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-tertiary)' }}>
                {inputLabel}
              </p>
            )}
            <input
              ref={inputRef}
              type="text"
              value={formValue}
              onChange={(e) => setFormValue(e.target.value)}
              className="w-full bg-transparent rounded border border-border px-3 py-2 text-text-primary focus:outline-none focus:border-gold"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}
              placeholder={inputPlaceholder ?? ''}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
            />
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex gap-2 justify-end">
          {!isInfo && (
            <button
              onClick={onCancel}
              className="font-mono uppercase tracking-widest rounded border border-border px-3 py-1.5 text-text-tertiary hover:text-text-primary transition-colors"
              style={{ fontSize: '9px' }}
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="font-mono uppercase tracking-widest rounded px-3 py-1.5 transition-opacity disabled:opacity-30"
            style={{
              fontSize: '9px',
              background: isDestructive ? 'var(--status-failed)' : 'var(--color-gold)',
              color: '#fff',
              border: 'none',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
