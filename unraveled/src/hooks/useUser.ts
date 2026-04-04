'use client';

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface UserState {
  user: User | null;
  loading: boolean;
}

/**
 * Returns the current Supabase auth user.
 * Reacts to sign-in / sign-out events automatically.
 */
export function useUser(): UserState {
  const [state, setState] = useState<UserState>({ user: null, loading: true });

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setState({ user, loading: false });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, loading: false });
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
