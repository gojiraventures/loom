import { NextRequest, NextResponse } from 'next/server';
import { getFindingsBySession } from '@/lib/research/storage/findings';
import { getValidationsBySession } from '@/lib/research/storage/validations';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const url = new URL(req.url);
  const includeValidations = url.searchParams.get('validations') === 'true';

  const [findings, validations] = await Promise.all([
    getFindingsBySession(sessionId).catch(() => []),
    includeValidations ? getValidationsBySession(sessionId).catch(() => []) : Promise.resolve([]),
  ]);

  return NextResponse.json({
    findings,
    ...(includeValidations ? { validations } : {}),
    count: findings.length,
  });
}
