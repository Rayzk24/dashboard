import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export function useAuthGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshAdminStatus = useCallback(async () => {
    if (!isSupabaseConfigured) return false;

    const { data, error: rpcError } = await supabase.rpc('has_admin');

    if (rpcError) {
      setError(rpcError.message);
      setAdminExists(null);
      return false;
    }

    setError(null);
    setAdminExists(Boolean(data));
    return Boolean(data);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return undefined;
    }

    let isMounted = true;

    async function boot() {
      setLoading(true);

      const { data } = await supabase.auth.getSession();
      const hasAdmin = await refreshAdminStatus();

      if (!isMounted) return;

      setSession(data.session);
      setAdminExists(hasAdmin);
      setLoading(false);
    }

    void boot();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void refreshAdminStatus();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [refreshAdminStatus]);

  return {
    adminExists,
    error,
    isConfigured: isSupabaseConfigured,
    loading,
    refreshAdminStatus,
    session,
    signOut,
  };
}
