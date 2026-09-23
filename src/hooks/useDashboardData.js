import { useCallback, useEffect, useState } from 'react';
import * as api from '../api/index.js';

const EMPTY_DATA = { groups: [], projects: [], bots: [], platforms: [] };

/**
 * Единый источник данных дашборда: группы, проекты, боты и платформы
 * загружаются одним каскадом и переиспользуются статистикой и всеми вкладками,
 * чтобы не делать повторных запросов при переключении разделов.
 */
export function useDashboardData(enabled) {
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);

  // Чистая загрузка без управления состоянием — общая логика, используется и ниже
  const fetchData = useCallback(async () => {
    const [groups, projects, platforms] = await Promise.all([
      api.getProjectGroups(),
      api.getAllProjects(),
      api.getPlatforms().catch(() => []),
    ]);
    const bots = await api.getAllBots(projects);
    return { groups, projects, bots, platforms };
  }, []);

  // Ручное обновление: кнопка «Обновить» и перезагрузка после мутаций
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchData());
    } catch {
      // при ошибке оставляем прежние данные
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  // Первичная загрузка после входа (когда появился токен).
  // Логика инлайн в эффекте, чтобы не triггерить предупреждение React-компилятора
  // о синхронном setState; отмена через cancelled на случай размонтирования.
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    async function init() {
      setLoading(true);
      try {
        const result = await fetchData();
        if (!cancelled) setData(result);
      } catch {
        // при ошибке оставляем прежние данные
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [enabled, fetchData]);

  return { ...data, loading, refresh };
}
