import { type KeyboardEvent, useRef, useState } from 'react';

import { useUsers } from '@/hooks/queries';
import { cn } from '@/lib/cn';
import type { User } from '@/lib/types';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
}

interface ActiveQuery {
  start: number; // index of the triggering '@'
  text: string; // typed text after '@' up to the caret
}

// Find an active "@query" immediately before the caret: an '@' at a word boundary (string
// start or after whitespace) followed by non-whitespace, non-']' characters up to the caret.
function activeQuery(value: string, caret: number): ActiveQuery | null {
  const upto = value.slice(0, caret);
  const at = upto.lastIndexOf('@');
  if (at === -1) return null;
  if (at > 0 && !/\s/.test(upto[at - 1])) return null; // avoid emails / mid-word '@'
  const text = upto.slice(at + 1);
  if (/[\s\]]/.test(text)) return null; // the query ends at whitespace or a closing ']'
  return { start: at, text };
}

/**
 * Drop-in replacement for a textarea that adds @-mention autocomplete. Same value/onChange
 * contract (emits the full string); typing "@" opens a popover of users (from the existing
 * useUsers hook) filtered live; Up/Down navigate, Enter/Tab/click select, Esc dismisses.
 * Selecting inserts the `@[Full Name]` token at the caret. Submission is unchanged.
 */
export function MentionInput({ value, onChange, placeholder, rows = 2, className, disabled }: MentionInputProps) {
  const users = useUsers();
  const people = (users.data ?? []).filter((u) => u.role !== 'system'); // the six personas
  const ref = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<ActiveQuery | null>(null);
  const [active, setActive] = useState(0);

  const matches = query
    ? people.filter((u) => u.name.toLowerCase().includes(query.text.toLowerCase())).slice(0, 6)
    : [];
  const open = !!query && matches.length > 0;

  function refresh(el: HTMLTextAreaElement) {
    const next = activeQuery(el.value, el.selectionStart ?? el.value.length);
    setQuery(next);
    setActive(0);
  }

  function select(u: User | undefined) {
    const el = ref.current;
    if (!u || !query || !el) return;
    const caret = el.selectionStart ?? value.length;
    const token = `@[${u.name}]`;
    const next = value.slice(0, query.start) + token + value.slice(caret);
    onChange(next);
    setQuery(null);
    const pos = query.start + token.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (!open) return; // popover closed -> textarea behaves normally (Enter = newline, etc.)
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % matches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + matches.length) % matches.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      select(matches[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setQuery(null);
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        disabled={disabled}
        rows={rows}
        placeholder={placeholder}
        className={className}
        onChange={(e) => {
          onChange(e.target.value);
          refresh(e.target);
        }}
        onKeyUp={(e) => refresh(e.currentTarget)}
        onClick={(e) => refresh(e.currentTarget)}
        onKeyDown={onKeyDown}
        onBlur={() => window.setTimeout(() => setQuery(null), 120)}
      />
      {open && (
        <ul className="absolute left-0 top-full z-20 mt-1 max-h-56 w-full min-w-[12rem] overflow-auto rounded-md border border-line bg-surface py-1 shadow-pop">
          {matches.map((u, i) => (
            <li key={u.user_id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // keep textarea focus/caret before selecting
                  select(u);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm',
                  i === active ? 'bg-brand-50' : 'hover:bg-canvas',
                )}
              >
                <span className="font-medium text-ink">{u.name}</span>
                <span className="text-xs text-ink-muted">{u.role.replace('_', ' ')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
