import { useCallback, useState } from 'react';
import { useToast } from '../providers/toast/useToast.js';
import { describeError } from '../utils/errors.js';

/**
 * Оборачивает асинхронную мутацию: лоадер, тосты при успехе/ошибке, колбэк после успеха.
 */
export function useMutation({ mutateFn, onSuccessMessage, onAfter }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (arg) => {
    setBusy(true);
    try {
      await mutateFn(arg);
      if (onSuccessMessage) toast.success(onSuccessMessage);
      onAfter?.();
      return true;
    } catch (error) {
      toast.error(describeError(error));
      return false;
    } finally {
      setBusy(false);
    }
  }, [mutateFn, onSuccessMessage, onAfter, toast]);

  return { run, busy };
}