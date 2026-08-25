import { useContext } from 'react';
import { ToastContext } from './ToastContext.js';

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast должен вызываться внутри <ToastProvider>');
  return context;
}
