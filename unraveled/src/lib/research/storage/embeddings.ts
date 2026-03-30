import { getPineconeClient } from '@/lib/pinecone';
import type { AgentFinding } from '../types';

const NAMESPACE = 'research-findings';

export async function upsertFindingEmbedding(
  findingId: string,
  finding: AgentFinding,
  embedding: number[],
): Promise<void> {
  const indexName = process.env.PINECONE_INDEX ?? 'unraveled-knowledge';
  const index = getPineconeClient().index(indexName);

  await index.namespace(NAMESPACE).upsert({
    records: [{
      id: findingId,
      values: embedding,
      metadata: {
        agent_id: finding.agent_id,
        claim_text: finding.claim_text.slice(0, 500),
        evidence_type: finding.evidence_type,
        strength: finding.strength,
        confidence: finding.confidence,
        traditions: finding.traditions,
      },
    }],
  });
}

export async function querySimilarFindings(
  embedding: number[],
  topK = 10,
  filter?: Record<string, unknown>,
) {
  const indexName = process.env.PINECONE_INDEX ?? 'unraveled-knowledge';
  const index = getPineconeClient().index(indexName);

  const results = await index.namespace(NAMESPACE).query({
    vector: embedding,
    topK,
    includeMetadata: true,
    filter,
  });

  return results.matches ?? [];
}
