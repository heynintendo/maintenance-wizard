import { Link } from 'react-router-dom';

import { Button } from '@/components/ui';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas text-center">
      <p className="text-5xl font-semibold text-ink-heading">404</p>
      <p className="text-ink-muted">This page does not exist.</p>
      <Link to="/dashboard">
        <Button>Back to dashboard</Button>
      </Link>
    </div>
  );
}
