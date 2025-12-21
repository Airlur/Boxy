import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * 全局提示 Hook
 * 管理 Toast 消息的显示与自动隐藏
 */
export function useToast() {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  // 清理定时器，防止内存泄漏
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const showToast = useCallback((msg, type = 'success', duration = 3000) => {
    // 如果有正在倒计时的定时器，先清除
    if (timerRef.current) clearTimeout(timerRef.current);

    setToast({ msg, type });
    
    timerRef.current = setTimeout(() => {
      setToast(null);
      timerRef.current = null;
    }, duration);
  }, []);

  return { toast, showToast };
}
