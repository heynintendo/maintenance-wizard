import { Collapsible, MarkdownView } from '@/components/ui';
import { formatDateTime, titleCase } from '@/lib/format';
import type { Report } from '@/lib/types';

import { ProvenanceList } from './Provenance';

function factValue(v: unknown): string {
  if (v === null || v === undefined) return '-';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function ReportView({ report }: { report: Report }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-ink-heading">{report.title}</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Generated {formatDateTime(report.generated_at)}
          {report.specialists_used.length > 0 &&
            ` · ${report.specialists_used.map(titleCase).join(', ')}`}
        </p>
      </div>

      {/* The clean synthesized report leads and stays fully visible. */}
      <MarkdownView>{report.body}</MarkdownView>

      {report.sections?.length > 0 && (
        <Collapsible title="Specialist findings" count={report.sections.length}>
          <div className="space-y-3">
            {report.sections.map((s, i) => {
              const facts = Object.entries(s.key_facts ?? {});
              return (
                <div key={i} className="rounded-lg border border-hairline bg-canvas p-4">
                  <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
                    {titleCase(s.role)}
                  </span>
                  <MarkdownView className="mt-2" compact>
                    {s.summary}
                  </MarkdownView>
                  {facts.length > 0 && (
                    <dl className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                      {facts.map(([k, v]) => (
                        <div key={k}>
                          <dt className="text-ink-muted">{titleCase(k)}</dt>
                          <dd className="text-ink">{factValue(v)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              );
            })}
          </div>
        </Collapsible>
      )}

      {report.provenance?.length > 0 && (
        <Collapsible title="Sources" count={report.provenance.length}>
          <ProvenanceList sources={report.provenance} bare />
        </Collapsible>
      )}
    </div>
  );
}
