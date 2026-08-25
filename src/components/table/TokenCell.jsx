import { useState } from 'react';
import { normalizeToken, maskToken } from '../../utils/format.js';
import { EyeIcon, EyeOffIcon } from '../icons.jsx';

export default function TokenCell({ value }) {
  const [revealed, setRevealed] = useState(false);
  const text = normalizeToken(value);
  if (!text) return <span className="muted">—</span>;

  return (
    <div className="token-cell">
      <code>{revealed ? text : maskToken(text)}</code>
      <button
        type="button"
        className="icon-btn"
        title={revealed ? 'Скрыть токен' : 'Показать токен'}
        onClick={(event) => {
          event.stopPropagation();
          setRevealed((current) => !current);
        }}
      >
        {revealed ? <EyeOffIcon width={14} height={14} /> : <EyeIcon width={14} height={14} />}
      </button>
    </div>
  );
}
