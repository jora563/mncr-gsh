import { useEffect } from 'react';
import { XIcon } from '../icons.jsx';

export default function Modal({ title, subtitle, onClose, children, footer, maxWidth = 460, confirm = false }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="modal-overlay open"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={`modal ${confirm ? 'confirm' : ''}`} role="dialog" aria-modal="true" style={{ maxWidth }}>
        {!confirm ? (
          <div className="modal-header">
            <div>
              <h3>{title}</h3>
              {subtitle ? <p>{subtitle}</p> : null}
            </div>
            <button type="button" className="icon-btn modal-close" aria-label="Закрыть" onClick={onClose}>
              <XIcon width={16} height={16} />
            </button>
          </div>
        ) : null}
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
