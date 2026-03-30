import { RESEARCH_AGENTS } from './agents/definitions';
import type { AgentDefinition, RaciAssignment } from './types';

/**
 * Scores an agent's relevance to a given topic based on
 * keyword overlap with primary and secondary expertise arrays.
 */
function scoreAgentRelevance(agent: AgentDefinition, topicKeywords: string[]): number {
  const lc = topicKeywords.map((k) => k.toLowerCase());

  let score = 0;
  for (const expertise of agent.primaryExpertise) {
    const e = expertise.toLowerCase();
    if (lc.some((k) => e.includes(k) || k.includes(e))) score += 3;
  }
  for (const expertise of agent.secondaryExpertise) {
    const e = expertise.toLowerCase();
    if (lc.some((k) => e.includes(k) || k.includes(e))) score += 1;
  }
  return score;
}

/**
 * Extracts keywords from a topic string and research questions.
 */
function extractKeywords(topic: string, questions: string[]): string[] {
  const text = [topic, ...questions].join(' ').toLowerCase();
  // Remove common stop words, split on word boundaries
  const stopWords = new Set(['the', 'a', 'an', 'of', 'in', 'and', 'or', 'to', 'is', 'are', 'was', 'were', 'for', 'with', 'that', 'this', 'how', 'what', 'why', 'when', 'where', 'do', 'did', 'does']);
  return text
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w));
}

export interface RaciScored {
  agent: AgentDefinition;
  score: number;
}

/**
 * Assigns RACI roles to research agents based on topic relevance.
 * Always includes all agents — low-scoring ones get Informed.
 */
export function assignRaci(
  topic: string,
  researchQuestions: string[],
  forceResponsible?: string[], // agent IDs that must be Responsible
): RaciAssignment {
  const keywords = extractKeywords(topic, researchQuestions);

  const scored: RaciScored[] = RESEARCH_AGENTS.map((agent) => ({
    agent,
    score: scoreAgentRelevance(agent, keywords),
  })).sort((a, b) => b.score - a.score);

  const responsible: string[] = [];
  const accountable: string[] = [];
  const consulted: string[] = [];
  const informed: string[] = [];

  // Force-add any required agents to Responsible
  if (forceResponsible) {
    for (const id of forceResponsible) {
      if (!responsible.includes(id)) responsible.push(id);
    }
  }

  for (const { agent, score } of scored) {
    if (responsible.includes(agent.id)) continue; // Already assigned

    if (score >= 6) {
      responsible.push(agent.id);
    } else if (score >= 3) {
      if (accountable.length === 0) {
        accountable.push(agent.id); // First good-enough agent is Accountable
      } else {
        consulted.push(agent.id);
      }
    } else if (score >= 1) {
      consulted.push(agent.id);
    } else {
      informed.push(agent.id);
    }
  }

  // Ensure at least one Responsible agent
  if (responsible.length === 0 && scored.length > 0) {
    responsible.push(scored[0].agent.id);
  }
  // Ensure at least one Accountable (promote from Consulted if needed)
  if (accountable.length === 0 && consulted.length > 0) {
    accountable.push(consulted.shift()!);
  }

  return { responsible, accountable, consulted, informed };
}

export function getActiveAgents(raci: RaciAssignment): string[] {
  return [...raci.responsible, ...raci.accountable];
}

export function getReviewAgents(raci: RaciAssignment): string[] {
  return [...raci.consulted];
}
