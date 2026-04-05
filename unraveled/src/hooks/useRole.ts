'use client';

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';

export type Role = 'anonymous' | 'registered' | 'paid' | 'admin';

interface RoleState {
  role: Role;
  loading: boolean;
}

/**
 * Returns the current user's role from the profiles table.
 * Returns 'anonymous' when not logged in.
 * Reads from profiles via RLS so only the user's own row is visible.
 */
export function useRole(): RoleState {
  const [state, setState] = useState<RoleState>({ role: 'anonymous', loading: true });

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState({ role: 'anonymous', loading: false });
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, promo_expires_at')
        .eq('id', user.id)
        .maybeSingle(); // returns null (not 406) when no row exists

      let role: Role = (profile?.role as Role) ?? 'registered';
      // Downgrade expired promo access
      if (role === 'paid' && profile?.promo_expires_at && new Date(profile.promo_expires_at) < new Date()) {
        role = 'registered';
      }

      setState({ role, loading: false });
    }

    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
