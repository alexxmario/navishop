import { useState, useRef, useCallback, useEffect } from 'react';

const TOAST_TIMEOUT = 4000;

export const useToast = () => {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((message, type = 'info') => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setToast({ message, type });
    timerRef.current = setTimeout(() => {
      setToast(null);
    }, TOAST_TIMEOUT);
  }, []);

  useEffect(() => () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  return { toast, showToast, clearToast: () => setToast(null) };
};
