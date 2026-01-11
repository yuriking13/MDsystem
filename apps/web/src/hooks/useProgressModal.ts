import { useState, useCallback } from 'react';

interface UseProgressModalOptions {
  title: string;
  endpoint: string;
  onComplete?: (data: any) => void;
}

export function useProgressModal(options: UseProgressModalOptions) {
  const [show, setShow] = useState(false);
  const [body, setBody] = useState<any>(null);

  const start = useCallback((requestBody?: any) => {
    setBody(requestBody || {});
    setShow(true);
  }, []);

  const close = useCallback(() => {
    setShow(false);
    setBody(null);
  }, []);

  const handleComplete = useCallback((data: any) => {
    if (options.onComplete) {
      options.onComplete(data);
    }
  }, [options]);

  return {
    show,
    body,
    start,
    close,
    title: options.title,
    endpoint: options.endpoint,
    onComplete: handleComplete,
  };
}
