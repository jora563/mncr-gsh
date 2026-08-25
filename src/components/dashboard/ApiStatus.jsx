import { useEffect, useState } from 'react';
import { health } from '../../api/index.js';
import { API_STATUS } from '../../constants.js';

const LABELS = {
  [API_STATUS.CHECKING]: 'Проверка связи…',
  [API_STATUS.OK]: 'API доступен',
  [API_STATUS.DOWN]: 'API недоступен',
};

const CHECK_INTERVAL_MS = 30000;

export default function ApiStatus() {
  const [status, setStatus] = useState(API_STATUS.CHECKING);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        await health();
        if (!cancelled) setStatus(API_STATUS.OK);
      } catch {
        if (!cancelled) setStatus(API_STATUS.DOWN);
      }
    }
    check();
    const timer = window.setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className={`api-status api-status--${status}`}>
      {status === API_STATUS.OK ? <span className="pulse-dot" /> : null}
      {LABELS[status]}
    </div>
  );
}
