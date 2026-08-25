import { useEffect, useState } from 'react';
import * as api from '../api/index.js';

/**
 * Загружает агрегированные счётчики (группы, проекты, боты, платформы).
 * version меняется после каждой мутации данных, чтобы счётчики обновлялись.
 */
export function useStats(version, enabled) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;

    async function load() {
      try {
        const groupList = await api.getProjectGroups();
        const projectList = await api.getAllProjects(groupList);
        const botList = await api.getAllBots(projectList);
        if (cancelled) return;
        const platforms = new Set(
          botList.map((bot) => bot.platform?.platform?.id).filter((id) => id != null),
        );
        setStats({
          groups: groupList.length,
          projects: projectList.length,
          bots: botList.length,
          platforms: platforms.size,
        });
      } catch {
        // счётчики не критичны — при ошибке оставляем предыдущее значение
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [version, enabled]);

  return stats;
}
