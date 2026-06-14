import { MarkdownView } from '@/components/ui';
import { titleCase } from '@/lib/format';
import type { Finding } from '@/lib/types';

import { ProvenanceList } from './Provenance';

function factValue(v: unknown): string {
  if (v === null || v === undefined) return '-';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function FindingCard({ finding }: { finding: Finding }) {
  const facts = Object.entries(finding.key_facts ?? {});
  return (
    <div className="rounded-lg border border-hairline bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
          {titleCase(finding.role)}
        </span>
        {finding.tools_used?.length > 0 && (
          <span className="text-xs text-ink-subtle">{finding.tools_used.join(', ')}</span>
        )}
      </div>
      <MarkdownView className="mt-2" compact>
        {finding.summary}
      </MarkdownView>
      {facts.length > 0 && (
        <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt className="text-ink-muted">{titleCase(k)}</dt>
              <dd className="text-ink">{factValue(v)}</dd>
            </div>
          ))}
        </dl>
      )}
      {finding.provenance?.length > 0 && (
        <div className="mt-3">
          <ProvenanceList sources={finding.provenance} title="Cited" />
        </div>
      )}
    </div>
  );
}
