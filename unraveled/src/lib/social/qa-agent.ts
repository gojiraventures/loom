/**
 * Gemini QA Agent — brand safety and quality gate for social content.
 *
 * Evaluates post text (and optionally a design image) against the
 * UnraveledTruth brand checklist. Returns structured PASS / FLAG / BLOCK.
 */

import { GoogleGenerativeAI, type Part } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export type QASeverity = 'pass' | 'flag' | 'block';

export interface QAIssue {
  category: 'spelling' | 'brand' | 'tone' | 'factual' | 'platform' | 'balance';
  severity: 'flag' | 'block';
  description: string;
  suggestion: string;
}

export interface QAResult {
  result: QASeverity;
  issues: QAIssue[];
  summary: string;
}

const QA_SYSTEM = `You are the brand quality assurance agent for UnraveledTruth, a research publication examining cross-cultural convergence patterns in mythology, archaeology, and ancient history.

BRAND IDENTITY:
- Tagline: "No ads. No sponsors. Just evidence."
- Voice: Intellectually rigorous, treats fringe-adjacent topics with scholarly care, presents both advocate and skeptic positions fairly
- Design: Dark color palette (near-black backgrounds), off-white or teal text, editorial serif typography
- Anti-patterns: "mind-blowing", "shocking", "what they don't want you to know", "ancient wisdom", "let's dive in", "buckle up", "thread time", sensationalist register

EVALUATION CRITERIA:

SPELLING & GRAMMAR
- Check all text for spelling errors, grammar issues
- Flag misspelled proper nouns (tradition names, historical figures, sacred texts)
- Verify non-English terms (Sanskrit, Hebrew, Greek, Arabic, etc.)

BRAND CONSISTENCY
- Dark palette: if image provided, background should be near-black, not white/light gray
- Typography should feel editorial, not playful or corporate
- Convergence score shown must match the reference score exactly
- No stock photography, clip art, or generic "AI art" aesthetics

TONE & BALANCE
- Must not oversell claims beyond what the source article states
- Must not use sensationalist language (flag: "mind-blowing", "shocking", etc.)
- Must maintain advocate/skeptic balance — never presents one side as correct
- Must treat all cultural traditions with equal respect (no exoticizing, no dismissiveness)
- "Audience test": appropriate for a) an academic researcher, b) a member of the referenced cultural community, c) a casual reader

FACTUAL ACCURACY
- Claims must not contradict or overstate the source article
- Dates, names, and specific claims must be accurate
- Convergence score (if mentioned) must match reference

PLATFORM COMPLIANCE
- X/Twitter: no single post over 280 chars
- Instagram captions: first line hooks before truncation (~125 chars)
- Facebook: no hashtag spam

OUTPUT FORMAT — return ONLY valid JSON:
{
  "result": "pass" | "flag" | "block",
  "issues": [
    {
      "category": "spelling" | "brand" | "tone" | "factual" | "platform" | "balance",
      "severity": "flag" | "block",
      "description": "specific issue",
      "suggestion": "how to fix it"
    }
  ],
  "summary": "one-sentence overall assessment"
}

Rules:
- "block" result if ANY issue has severity "block" (factual errors, offensive content, wrong score)
- "flag" result if issues exist but none are blockers
- "pass" if no issues found
- Be specific — vague flags are useless. Name the exact word/phrase/claim that's problematic.`;

function buildQAPrompt(opts: {
  platform: string;
  content_type: string;
  text_content: string;
  supplementary: Record<string, unknown> | null;
  article_title: string;
  convergence_score: number;
  has_image: boolean;
}): string {
  const threadPosts = opts.supplementary?.posts as string[] | undefined;
  const slides = opts.supplementary?.slides as { header?: string; body: string }[] | undefined;

  let content = `POST TEXT:\n${opts.text_content}`;

  if (threadPosts?.length) {
    content += `\n\nTHREAD POSTS (${threadPosts.length} total):\n${threadPosts.map((p, i) => `[${i + 1}] ${p} (${p.length} chars)`).join('\n')}`;
  }
  if (slides?.length) {
    content += `\n\nCARROUSEL SLIDES (${slides.length} total):\n${slides.map((s, i) => `[${i + 1}] ${s.header ? `${s.header}: ` : ''}${s.body}`).join('\n')}`;
  }

  return `Evaluate this ${opts.platform.toUpperCase()} ${opts.content_type.replace(/_/g, ' ')} post for UnraveledTruth.

REFERENCE ARTICLE: "${opts.article_title}"
REFERENCE CONVERGENCE SCORE: ${opts.convergence_score}/100
PLATFORM: ${opts.platform}
${opts.has_image ? 'NOTE: An image has been provided — evaluate visual brand consistency too.\n' : ''}
${content}

Return the JSON QA assessment.`;
}

export async function runQA(opts: {
  platform: string;
  content_type: string;
  text_content: string;
  supplementary: Record<string, unknown> | null;
  article_title: string;
  convergence_score: number;
  image_base64?: string;
  image_mime?: string;
}): Promise<QAResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = buildQAPrompt({ ...opts, has_image: !!opts.image_base64 });

  // Build content parts
  const contentParts: Part[] = [
    { text: `${QA_SYSTEM}\n\n${prompt}` },
  ];

  if (opts.image_base64 && opts.image_mime) {
    contentParts.push({
      inlineData: { mimeType: opts.image_mime, data: opts.image_base64 },
    });
  }

  const response = await model.generateContent({ contents: [{ role: 'user', parts: contentParts }] });
  const raw = response.response.text().trim();

  try {
    const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    return JSON.parse(cleaned) as QAResult;
  } catch {
    // If parsing fails, return a flag rather than throwing
    return {
      result: 'flag',
      issues: [{
        category: 'brand',
        severity: 'flag',
        description: 'QA agent returned unparseable response',
        suggestion: 'Re-run QA or review manually',
      }],
      summary: 'QA response could not be parsed — manual review recommended',
    };
  }
}
