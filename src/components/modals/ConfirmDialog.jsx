import Modal from './Modal.jsx';
import { AlertTriangleIcon } from '../icons.jsx';

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Удалить',
  busy = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      confirm
      onClose={onCancel}
      maxWidth={400}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
            Отмена
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'Удаление…' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="confirm-icon">
        <AlertTriangleIcon width={22} height={22} />
      </div>
      <div className="confirm-body">
        <h3>{title}</h3>
        <p>{message}</p>
      </div>
    </Modal>
  );
}
