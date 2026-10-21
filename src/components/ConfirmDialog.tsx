import { useEffect, useRef } from 'react';

type Props = {
  onCancel: () => void;
  onConfirm: () => void;
};

// Delete confirmation layered over About; not a separate screen (DESIGN §1.3).
export default function ConfirmDialog({ onCancel, onConfirm }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return (
    <div className="dialog-scrim">
      <div
        className="dialog-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-text"
      >
        <h2 id="confirm-title" className="dialog-title">
          למחוק את ההיסטוריה?
        </h2>
        <p id="confirm-text" className="dialog-text">
          כל תוצאות המשחקים יימחקו.
        </p>
        <div className="dialog-actions">
          <button ref={cancelRef} type="button" className="dialog-button dialog-button--cancel" onClick={onCancel}>
            ביטול
          </button>
          <button type="button" className="dialog-button dialog-button--delete" onClick={onConfirm}>
            מחק
          </button>
        </div>
      </div>
    </div>
  );
}
