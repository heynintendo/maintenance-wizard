import { type ReactNode } from 'react';

import { mentionRegex } from '@/lib/mentions';

// A styled, non-wrapping mention chip ("@A. Bose"). Uses the existing brand accent token --
// no new visual language.
function MentionChip({ name }: { name: string }) {
  return (
    <span className="mx-0.5 inline-flex items-center whitespace-nowrap rounded bg-brand-50 px-1.5 py-px align-baseline text-[0.95em] font-medium text-brand-700">
      @{name}
    </span>
  );
}

/**
 * Renders a string, replacing every `@[Full Name]` token with a mention chip. A string with
 * no token renders as the raw text (a Fragment, no wrapper element) -- so wrapping an existing
 * text display in <MentionText> is a no-op for entries without a mention (full backward-compat).
 */
export function MentionText({ children }: { children: string | null | undefined }) {
  const text = children ?? '';
  if (!text) return <>{text}</>;

  const re = mentionRegex();
  const parts: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<MentionChip key={key++} name={m[1].trim()} />);
    last = m.index + m[0].length;
  }
  if (parts.length === 0) return <>{text}</>;
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
