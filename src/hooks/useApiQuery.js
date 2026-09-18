import { useState, useEffect, useCallback } from 'react';

export function useApiQuery(queryFn) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await queryFn();
      setData(result);
    } catch (err) {
      setError(err.message || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  }, [queryFn]);

  useEffect(() => {
    queueMicrotask(() => {
      refetch();
    });
  }, [refetch]);

  return { data, loading, error, refetch };
}
