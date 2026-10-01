import { useEffect, useId, useRef } from 'react';
import { copy } from '@/locales/vi';
export function ConfirmDialog({
  open,
  title,
  description,
  onCancel,
  onConfirm,
  confirmLabel = copy.common.confirm,
  destructive = false,
  pending = false,
}: {
  open: boolean;
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  destructive?: boolean;
  pending?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    else if (!open && dialog?.open) dialog.close();
  }, [open]);
  return (
    <dialog
      className="confirm-dialog"
      ref={ref}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
    >
      <h2 id={`${id}-title`}>{title}</h2>
      <p id={`${id}-description`}>{description}</p>
      <div className="dialog-actions">
        <button autoFocus className="button button-secondary" disabled={pending} onClick={onCancel}>
          {copy.common.cancel}
        </button>
        <button
          className={`button ${destructive ? 'button-danger' : ''}`}
          disabled={pending}
          onClick={onConfirm}
        >
          {pending ? copy.common.loading : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
