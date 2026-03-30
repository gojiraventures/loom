import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/research';
import { getDebateBySession } from '@/lib/research/storage/debates';
import { getDossier } from '@/lib/research/storage/dossiers';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;

  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Include debate + dossier when complete
  let debate = null;
  let dossier = null;
  if (session.status === 'complete') {
    [debate, dossier] = await Promise.all([
      getDebateBySession(sessionId).catch(() => null),
      getDossier(session.topic).catch(() => null),
    ]);
  }

  return NextResponse.json({ session, debate, dossier });
}
