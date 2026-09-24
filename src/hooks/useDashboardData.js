import { useCallback, useEffect, useSyncExternalStore } from 'react';
import * as api from '../api/index.js';

const EMPTY_DATA = { groups: [], projects: [], bots: [], platforms: [] };

// Модульное хранилище данных дашборда: каскад загружается один раз за сессию
// и переиспользуется ремount-ами и экземплярами хука, поэтому повторных
// автоматических загрузок (включая двойной монтаж React StrictMode) не происходит.
const dashboardStore = {
  state: { data: EMPTY_DATA, loading: true },
  started: false,
  inflight: null,
  listeners: new Set(),
};

function subscribeDashboard(listener) {
  dashboardStore.listeners.add(listener);
  return () => {
    dashboardStore.listeners.delete(listener);
  };
}

function getDashboardState() {
  return dashboardStore.state;
}

function setDashboardState(patch) {
  dashboardStore.state = { ...dashboardStore.state, ...patch };
  dashboardStore.listeners.forEach((listener) => listener());
}

// Чистая загрузка без управления состоянием — общая логика, используется и ниже
function loadDashboardData() {
  return (async () => {
    const [groups, projects, platforms] = await Promise.all([
      api.getProjectGroups(),
      api.getAllProjects(),
      // Платформы — вспомогательный справочник для формы бота;
      // их недоступность не должна ломать весь дашборд.
      api.getPlatforms().catch(() => []),
    ]);
    const bots = await api.getAllBots(projects);
    return { groups, projects, bots, platforms };
  })();
}

function startDashboardLoad() {
  if (dashboardStore.inflight) return dashboardStore.inflight;
  // При первом старте loading уже true в начальном состоянии —
  // не эмитим синхронное обновление, чтобы не провоцировать каскадные рендеры.
  if (!dashboardStore.state.loading) {
    setDashboardState({ loading: true });
  }
  dashboardStore.inflight = loadDashboardData()
    .then((result) => {
      setDashboardState({ data: result });
    })
    .catch(() => {
      // при ошибке оставляем прежние данные
    })
    .finally(() => {
      dashboardStore.inflight = null;
      setDashboardState({ loading: false });
    });
  return dashboardStore.inflight;
}

/**
 * Единый источник данных дашборда: группы, проекты, боты и платформы
 * загружаются одним каскадом и переиспользуются статистикой и всеми вкладками,
 * чтобы не делать повторных запросов при переключении разделов.
 * Данные загружаются автоматически один раз за сессию; далее каскад
 * перезагружается только вручную через refresh().
 */
export function useDashboardData(enabled) {
  // Первичная загрузка после входа (когда появился токен).
  useEffect(() => {
    if (!enabled) return undefined;
    if (!dashboardStore.started) {
      dashboardStore.started = true;
      startDashboardLoad();
    }
    return undefined;
  }, [enabled]);

  const { data, loading } = useSyncExternalStore(subscribeDashboard, getDashboardState);

  // Ручное обновление: кнопка «Обновить» и перезагрузка после мутаций
  const refresh = useCallback(async () => startDashboardLoad(), []);

  return { ...data, loading, refresh };
}
