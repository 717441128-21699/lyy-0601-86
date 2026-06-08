import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useHealthStore } from '../store';

const EVENTS = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

export function useAutoLock() {
  const { isLocked, settings, lock } = useHealthStore();
  const location = useLocation();
  const timerRef = useRef<number | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (settings.autoLockTimeout <= 0 || isLocked) {
      return;
    }

    timerRef.current = window.setTimeout(() => {
      lock();
    }, settings.autoLockTimeout * 1000);
  }, [settings.autoLockTimeout, isLocked, lock]);

  useEffect(() => {
    if (isLocked) {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const handleEvent = () => {
      resetTimer();
    };

    EVENTS.forEach((event) => {
      document.addEventListener(event, handleEvent, { passive: true });
    });

    resetTimer();

    return () => {
      EVENTS.forEach((event) => {
        document.removeEventListener(event, handleEvent);
      });
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isLocked, resetTimer]);

  useEffect(() => {
    if (!isLocked) {
      resetTimer();
    }
  }, [location.pathname, isLocked, resetTimer]);
}
