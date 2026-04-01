import { handleAgentSignal } from './handlers/agent-signal';
import { handleCrossValidation } from './handlers/cross-validation';
import { handleConvergence } from './handlers/convergence';
import { handleDebate } from './handlers/debate';
import { handleSynthesisOutline } from './handlers/synthesis-outline';
import { handleSynthesisSection } from './handlers/synthesis-section';
import { handleSynthesisAssembly } from './handlers/synthesis-assembly';
import type { ResearchJob, JobType } from '@/lib/research/storage/jobs';

type Handler = (job: ResearchJob) => Promise<Record<string, unknown>>;

const HANDLERS: Record<JobType, Handler> = {
  agent_signal: handleAgentSignal,
  cross_validation: handleCrossValidation,
  convergence: handleConvergence,
  debate: handleDebate,
  synthesis_outline: handleSynthesisOutline,
  synthesis_section: handleSynthesisSection,
  synthesis_assembly: handleSynthesisAssembly,
};

export async function dispatch(job: ResearchJob): Promise<Record<string, unknown>> {
  const handler = HANDLERS[job.job_type];
  if (!handler) {
    throw new Error(`Unknown job_type: ${job.job_type}`);
  }
  return handler(job);
}
