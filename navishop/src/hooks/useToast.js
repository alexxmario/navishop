import { useState, useRef, useCallback, useEffect } from 'react';

const TOAST_TIMEOUT = 4000;

export const useToast = (initialPoint = { x: 24, y: 24 }) => {
  const [toast, setToast] = useState(null);
  const [mountPoint, setMountPoint] = useState(initialPoint);
  const timerRef = useRef(null);

  const showToast = useCallback((message, type = 'info', options = {}) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    const { offset = initialPoint } = options;
    if (offset) {
      setMountPoint(offset);
    }
    setToast({ message, type });
    timerRef.current = setTimeout(() => {
      setToast(null);
    }, TOAST_TIMEOUT);
  }, [initialPoint]);

  useEffect(() => () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  return { toast, showToast, clearToast: () => setToast(null), mountPoint };
};
