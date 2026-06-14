import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/auth/AuthContext';
import { playAlert } from '@/lib/sound';
import type { Alert } from '@/lib/types';

import { useAlerts } from './queries';

const RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

// Polls all alerts; when a NEW, unacknowledged alert targeted at the current role
// appears, it raises the banner and plays the tone exactly once.
export function useAlertWatcher() {
  const { user } = useAuth();
  const { data } = useAlerts(undefined, 5000);
  const seen = useRef<Set<string> | null>(null);
  const [banner, setBanner] = useState<Alert | null>(null);

  useEffect(() => {
    if (!data) return;
    const role = user?.role;

    // First successful load seeds the seen-set so existing alerts never fire.
    if (seen.current === null) {
      seen.current = new Set(data.map((a) => a.alert_id));
      return;
    }

    const fresh = data.filter(
      (a) =>
        !seen.current!.has(a.alert_id) &&
        !a.acknowledged &&
        (!role || a.audience_roles.includes(role)),
    );

    // Mark every current id as seen so nothing fires twice.
    data.forEach((a) => seen.current!.add(a.alert_id));

    if (fresh.length > 0) {
      const top = [...fresh].sort((a, b) => (RANK[b.severity] ?? 0) - (RANK[a.severity] ?? 0))[0];
      setBanner(top);
      playAlert();
    }
  }, [data, user?.role]);

  const alertCount = (data ?? []).filter((a) => !a.acknowledged).length;
  return { banner, dismiss: () => setBanner(null), alertCount };
}
