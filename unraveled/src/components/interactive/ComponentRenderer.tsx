'use client';

/**
 * Renders an interactive component by ID, using the pre-computed data
 * stored in topic_dossiers.selected_components.
 */

import type { ComponentRecord, ComponentId } from '@/lib/interactive/types';
import { ConvergenceScoreGauge }       from './ConvergenceScoreGauge';
import { SourceTypeBreakdown }         from './SourceTypeBreakdown';
import { TraditionDeepDiveAccordion }  from './TraditionDeepDiveAccordion';
import { DebateSimulator }             from './DebateSimulator';

interface Props {
  component: ComponentRecord;
}

export function ComponentRenderer({ component }: Props) {
  if (!component.enabled) return null;

  switch (component.id as ComponentId) {
    case 'convergence_score_gauge':
      return <ConvergenceScoreGauge data={component.data as Parameters<typeof ConvergenceScoreGauge>[0]['data']} />;
    case 'source_type_breakdown':
      return <SourceTypeBreakdown data={component.data as Parameters<typeof SourceTypeBreakdown>[0]['data']} />;
    case 'tradition_deep_dive':
      return <TraditionDeepDiveAccordion data={component.data as Parameters<typeof TraditionDeepDiveAccordion>[0]['data']} />;
    case 'debate_simulator':
      return <DebateSimulator data={component.data as Parameters<typeof DebateSimulator>[0]['data']} />;
    default:
      return null;
  }
}
