import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Modal } from 'antd';
import { inspectionApi } from '../api';
import { TodayProgress, CellarTodayProgress } from '../types';

interface TodayProgressContextValue {
  progress: TodayProgress | null;
  loading: boolean;
  formDirty: boolean;
  refreshProgress: () => Promise<void>;
  getUnfinishedCellars: () => CellarTodayProgress[];
  setFormDirty: (dirty: boolean) => void;
  navigateToInspection: (cellarId: number, period?: 'morning' | 'afternoon') => void;
}

const TodayProgressContext = createContext<TodayProgressContextValue>({
  progress: null,
  loading: false,
  formDirty: false,
  refreshProgress: async () => {},
  getUnfinishedCellars: () => [],
  setFormDirty: () => {},
  navigateToInspection: () => {},
});

export const useTodayProgress = () => useContext(TodayProgressContext);

export const TodayProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [progress, setProgress] = useState<TodayProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const refreshingRef = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();

  const refreshProgress = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setLoading(true);
    try {
      const res = await inspectionApi.getTodayProgress();
      if (res.success) {
        setProgress(res.data || null);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      refreshingRef.current = false;
    }
  }, []);

  useEffect(() => {
    refreshProgress();
  }, [refreshProgress]);

  useEffect(() => {
    if (location.pathname !== '/') {
      setFormDirty(false);
    }
    refreshProgress();
  }, [location.pathname, refreshProgress]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshProgress();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshProgress]);

  const getUnfinishedCellars = useCallback(() => {
    if (!progress) return [];
    return progress.cellars.filter(
      (c) => c.morning !== 'completed' || c.afternoon !== 'completed'
    );
  }, [progress]);

  const navigateToInspection = useCallback(
    (cellarId: number, period?: 'morning' | 'afternoon') => {
      let targetUrl = `/?cellar_id=${cellarId}`;
      if (period) {
        targetUrl += `&period=${period}`;
      }

      if (location.pathname === '/' && formDirty) {
        Modal.confirm({
          title: '表单尚未提交',
          content: '当前表单有未提交的内容，确定要切换窖位吗？',
          okText: '确定切换',
          cancelText: '继续编辑',
          onOk: () => {
            setFormDirty(false);
            navigate(targetUrl + '&switch_confirmed=1');
          },
        });
      } else {
        navigate(targetUrl);
      }
    },
    [formDirty, location.pathname, navigate]
  );

  return (
    <TodayProgressContext.Provider
      value={{
        progress,
        loading,
        formDirty,
        refreshProgress,
        getUnfinishedCellars,
        setFormDirty,
        navigateToInspection,
      }}
    >
      {children}
    </TodayProgressContext.Provider>
  );
};
