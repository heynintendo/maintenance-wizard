import { useEffect } from 'react';
import { Link, Outlet } from 'react-router-dom';

import { Bell } from 'lucide-react';

import { useAuth } from '@/auth/AuthContext';
import { IntroSplash } from '@/components/brand/IntroSplash';
import { AlertBanner } from '@/components/domain/AlertBanner';
import { AlertFlash } from '@/components/domain/AlertFlash';
import { useAlertWatcher } from '@/hooks/useAlertWatcher';
import { initMuted } from '@/lib/sound';

import { MentionsBell } from './MentionsBell';
import { MuteToggle } from './MuteToggle';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

function AlertBell({ count }: { count: number }) {
  return (
    <Link
      to="/alerts"
      className="relative rounded-md p-2 text-white/80 transition-colors hover:bg-white/10"
      title="Alert center"
    >
      <Bell className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-critical px-1 text-[10px] font-semibold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}

export function AppShell() {
  const { banner, dismiss, alertCount } = useAlertWatcher();
  const { splashPending, consumeSplash } = useAuth();

  useEffect(() => {
    initMuted();
  }, []);

  return (
    <div className="flex h-screen flex-col">
      {splashPending && <IntroSplash onDone={consumeSplash} />}
      {banner && <AlertFlash key={banner.alert_id} severity={banner.severity} />}
      <Topbar
        right={
          <div className="flex items-center gap-1">
            <MuteToggle />
            <MentionsBell />
            <AlertBell count={alertCount} />
          </div>
        }
      />
      {banner && <AlertBanner alert={banner} onDismiss={dismiss} />}
      <div className="flex min-h-0 flex-1">
        <Sidebar alertCount={alertCount} />
        <main className="scrollbar-thin flex-1 overflow-y-auto bg-canvas">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
