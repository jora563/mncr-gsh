import { useEffect, useState } from 'react';
import { health } from '../../api/index.js';
import { API_STATUS } from '../../constants.js';

const LABELS = {
  [API_STATUS.CHECKING]: 'Проверка связи…',
  [API_STATUS.OK]: 'API доступен',
  [API_STATUS.DOWN]: 'API недоступен',
};

const CHECK_INTERVAL_MS = 30000;

// Результат и время последней проверки на уровне модуля: при ремоунте
// компонента не стреляем немедленным запросом, а показываем последний
// известный статус и дожидаемся остатка интервала.
let lastStatus = null;
let lastCheckAt = 0;

export default function ApiStatus() {
  const [status, setStatus] = useState(lastStatus ?? API_STATUS.CHECKING);

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    async function check() {
      lastCheckAt = Date.now();
      try {
        await health();
        lastStatus = API_STATUS.OK;
      } catch {
        lastStatus = API_STATUS.DOWN;
      }
      if (!cancelled) setStatus(lastStatus);
      scheduleNext();
    }

    function scheduleNext() {
      const delay = Math.max(0, lastCheckAt + CHECK_INTERVAL_MS - Date.now());
      timer = window.setTimeout(() => {
        if (!cancelled) check();
      }, delay);
    }

    if (lastStatus === null) {
      // Первая проверка за сессию — выполняем сразу
      check();
    } else {
      // Уже проверяли недавно: ждём остаток интервала
      scheduleNext();
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className={`api-status api-status--${status}`}>
      {status === API_STATUS.OK ? <span className="pulse-dot" /> : null}
      {LABELS[status]}
    </div>
  );
}
