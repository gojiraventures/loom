'use client';

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';

export type Role = 'anonymous' | 'registered' | 'paid' | 'admin';

interface RoleState {
  role: Role;
  loading: boolean;
}

/**
 * Shared, module-level role cache. Many components (every CitedText marker,
 * every ContentGate) call useRole; without this each instance would run its
 * own auth + profile query and its own auth subscription. Instead we fetch
 * once per page load and fan the result out to all subscribers.
 */
let cache: RoleState = { role: 'anonymous', loading: true };
let started = false;
const listeners = new Set<(s: RoleState) => void>();

function publish(next: RoleState) {
  cache = next;
  listeners.forEach((l) => l(cache));
}

async function loadRole() {
  const supabase = createBrowserSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return publish({ role: 'anonymous', loading: false });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, promo_expires_at')
    .eq('id', user.id)
    .maybeSingle();

  let role: Role = (profile?.role as Role) ?? 'registered';
  if (role === 'paid' && profile?.promo_expires_at && new Date(profile.promo_expires_at) < new Date()) {
    role = 'registered';
  }
  publish({ role, loading: false });
}

function ensureStarted() {
  if (started) return;
  started = true;
  const supabase = createBrowserSupabaseClient();
  loadRole();
  supabase.auth.onAuthStateChange(() => loadRole());
}

export function useRole(): RoleState {
  const [state, setState] = useState<RoleState>(cache);

  useEffect(() => {
    ensureStarted();
    listeners.add(setState);
    setState(cache); // sync with any result that arrived before mount
    return () => { listeners.delete(setState); };
  }, []);

  return state;
}
