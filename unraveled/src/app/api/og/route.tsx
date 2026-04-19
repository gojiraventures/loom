import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title') ?? 'Unraveled';
  const scoreRaw = parseInt(searchParams.get('score') ?? '0', 10);
  const traditions = parseInt(searchParams.get('traditions') ?? '0', 10);

  const scoreColor =
    scoreRaw >= 80 ? '#5DBCB0'
    : scoreRaw >= 60 ? '#C8956C'
    : scoreRaw >= 40 ? '#A8A49A'
    : '#6B6660';

  const scoreLabel =
    scoreRaw >= 80 ? 'Extraordinary convergence'
    : scoreRaw >= 60 ? 'Strong convergence'
    : scoreRaw >= 40 ? 'Moderate convergence'
    : 'Weak convergence';

  const response = new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          backgroundColor: '#0a0a0b',
          padding: '60px 64px',
          border: '1px solid #2a2825',
        }}
      >
        {/* Top: wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: 13,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: '#5DBCB0',
            }}
          >
            UNRAVELED
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#3a3733' }}>—</span>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: 11,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#3a3733',
            }}
          >
            Cross-Tradition Evidence Index
          </span>
        </div>

        {/* Center: title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'center', padding: '40px 0' }}>
          <p
            style={{
              fontSize: title.length > 60 ? 38 : title.length > 40 ? 44 : 52,
              fontWeight: 400,
              lineHeight: 1.08,
              color: '#f5f4f2',
              margin: 0,
              maxWidth: '820px',
              fontFamily: 'serif',
            }}
          >
            {title}
          </p>
          {traditions > 0 && (
            <p
              style={{
                fontFamily: 'monospace',
                fontSize: 13,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: '#6b6660',
                margin: 0,
              }}
            >
              {traditions} independent tradition{traditions !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Bottom: score + label */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: 10,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#4a4745',
              }}
            >
              Convergence Score
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: 80, fontWeight: 400, color: scoreColor, lineHeight: 1, fontFamily: 'monospace' }}>
                {scoreRaw}
              </span>
              <span style={{ fontSize: 28, color: '#4a4745', fontFamily: 'monospace' }}>/100</span>
            </div>
          </div>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: 12,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: scoreColor,
              alignSelf: 'flex-end',
              paddingBottom: '8px',
            }}
          >
            {scoreLabel}
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
  response.headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  return response;
}
