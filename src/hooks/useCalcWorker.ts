/**
 * useCalcWorker — React hook for off-main-thread ROI/profit calculations.
 * Spawns a single shared worker per component mount, terminates on unmount.
 */
import { useRef, useCallback, useEffect } from 'react';
import type { CalcRequest, CalcResult } from '@/workers/calculation.worker';

type ResultCallback = (result: CalcResult['result']) => void;

export function useCalcWorker() {
  const workerRef = useRef<Worker | null>(null);
  const callbacksRef = useRef<Map<string, ResultCallback>>(new Map());

  useEffect(() => {
    // Only create worker in browser environments that support it
    if (typeof Worker === 'undefined') return;

    const worker = new Worker(
      new URL('../workers/calculation.worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e: MessageEvent<CalcResult>) => {
      const cb = callbacksRef.current.get(e.data.type);
      if (cb) cb(e.data.result);
    };

    worker.onerror = (err) => {
      console.warn('[CalcWorker] error:', err.message);
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const calculate = useCallback(
    (request: CalcRequest, onResult: ResultCallback) => {
      callbacksRef.current.set(request.type, onResult);
      if (workerRef.current) {
        workerRef.current.postMessage(request);
      } else {
        // Fallback: run sync on main thread if worker not available
        // (handled by the component itself — this should rarely happen)
      }
    },
    []
  );

  return { calculate };
}
