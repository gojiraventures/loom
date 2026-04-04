'use client';

import { useRole } from '@/hooks/useRole';
import { PaywallPrompt } from '@/components/PaywallPrompt';

const ROLE_RANK: Record<string, number> = {
  anonymous: 0,
  registered: 1,
  paid: 2,
  admin: 3,
};

interface Props {
  /** Minimum role required to see the content */
  requiredRole: 'registered' | 'paid';
  /** Short label shown in the paywall prompt, e.g. "Full source bibliography" */
  feature: string;
  children: React.ReactNode;
}

/**
 * Client-side role gate. Wraps any server-rendered children and either
 * reveals them or replaces them with a PaywallPrompt based on the
 * signed-in user's role.
 */
export function ContentGate({ requiredRole, feature, children }: Props) {
  const { role, loading } = useRole();

  if (loading) return null;

  if (ROLE_RANK[role] >= ROLE_RANK[requiredRole]) {
    return <>{children}</>;
  }

  return <PaywallPrompt feature={feature} />;
}
