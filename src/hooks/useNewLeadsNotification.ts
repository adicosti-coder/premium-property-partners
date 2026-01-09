import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useNewLeadsNotification = (activeTab: string) => {
  const [newLeadsCount, setNewLeadsCount] = useState(0);

  // Reset count when user views the Leads tab
  useEffect(() => {
    if (activeTab === 'leads') {
      setNewLeadsCount(0);
    }
  }, [activeTab]);

  // Listen for new leads in realtime
  useEffect(() => {
    const channel = supabase
      .channel('admin-leads-badge')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
        },
        () => {
          // Only increment if not currently viewing leads tab
          if (activeTab !== 'leads') {
            setNewLeadsCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab]);

  const clearCount = useCallback(() => {
    setNewLeadsCount(0);
  }, []);

  return { newLeadsCount, clearCount };
};
