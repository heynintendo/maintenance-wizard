import { useState } from 'react';

import { FileText, Loader2 } from 'lucide-react';

import { useAuth } from '@/auth/AuthContext';
import { canDo } from '@/auth/roles';
import { PageHeader } from '@/components/shell/PageHeader';
import { Button, Card, CardBody, EmptyState, ErrorState, Select } from '@/components/ui';
import { ReportView } from '@/components/domain/ReportView';
import { useGenerateReport } from '@/hooks/mutations';
import { useEquipment } from '@/hooks/queries';
import { ApiError } from '@/lib/api';

export default function ReportsPage() {
  const equipment = useEquipment();
  const gen = useGenerateReport();
  const { user } = useAuth();
  const canGenerate = canDo(user?.role, 'generate_report');
  const [equipmentId, setEquipmentId] = useState('');

  const assets = equipment.data ?? [];
  const selected = equipmentId || assets[0]?.equipment_id || '';
  const is429 = gen.error instanceof ApiError && gen.error.status === 429;
  const is503 = gen.error instanceof ApiError && gen.error.status === 503;
  const isTimeout = gen.error instanceof DOMException && gen.error.name === 'TimeoutError';

  return (
    <>
      <PageHeader
        title="Reports"
        description="Generate a structured, source-traceable equipment report"
      />
      <div className="space-y-6 p-6">
        <Card>
          <CardBody className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-ink-muted">Equipment</label>
              <Select value={selected} onChange={(e) => setEquipmentId(e.target.value)}>
                {assets.map((e) => (
                  <option key={e.equipment_id} value={e.equipment_id}>
                    {e.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              onClick={() => selected && gen.mutate(selected)}
              loading={gen.isPending}
              disabled={!canGenerate || !selected}
            >
              <FileText className="h-4 w-4" /> Generate report
            </Button>
            {!canGenerate && (
              <span className="text-sm text-ink-muted">Your role cannot generate reports.</span>
            )}
          </CardBody>
        </Card>

        {gen.isPending && (
          <Card>
            <CardBody className="flex items-center gap-3 py-10 text-sm">
              <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
              <div>
                <p className="font-medium text-ink">Generating report…</p>
                <p className="text-ink-muted">
                  Runs the full specialist chain on the live data. This usually takes 20-30 seconds.
                </p>
              </div>
            </CardBody>
          </Card>
        )}

        {gen.isError && !gen.isPending && (
          <Card>
            <CardBody>
              <ErrorState
                title={
                  is429
                    ? 'AI capacity reached'
                    : isTimeout
                      ? 'Report timed out'
                      : is503
                        ? "Couldn't generate the report"
                        : 'Report generation failed'
                }
                message={
                  is429
                    ? 'The free-tier daily token cap is exhausted. Try again after it resets.'
                    : isTimeout
                      ? 'It took longer than 40 seconds, likely model slowness or rate limiting. Try again.'
                      : is503
                        ? 'The analysis step did not complete. Please try again.'
                        : gen.error instanceof Error
                          ? gen.error.message
                          : 'Unknown error'
                }
                onRetry={() => selected && gen.mutate(selected)}
              />
            </CardBody>
          </Card>
        )}

        {gen.isSuccess && gen.data && !gen.isPending && (
          <Card>
            <CardBody>
              <ReportView report={gen.data} />
            </CardBody>
          </Card>
        )}

        {!gen.isPending && !gen.data && !gen.isError && (
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="No report yet"
            description="Pick an asset and generate a structured, cited report."
          />
        )}
      </div>
    </>
  );
}
