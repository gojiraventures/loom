/**
 * Satori + Sharp renderer for social card templates.
 *
 * Pipeline: DesignBrief → React element → Satori SVG → Sharp PNG buffer
 *
 * Fonts are fetched from Google Fonts CDN on first call and cached in-process.
 * For local dev this is fast enough; in production pin to a CDN with cache headers.
 */

import satori from 'satori';
import sharp from 'sharp';
import type { DesignBrief } from './art-director-agent';
import { renderTemplate, DIMENSIONS } from './templates';

// ── Font cache ────────────────────────────────────────────────────────────────

type FontWeight = 400 | 600 | 700;
type FontStyle = 'normal' | 'italic';
type FontData = { name: string; data: ArrayBuffer; weight: FontWeight; style: FontStyle };

let fontCache: FontData[] | null = null;

async function fetchFont(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font fetch failed: ${url} — ${res.status}`);
  return res.arrayBuffer();
}

async function getFonts(): Promise<FontData[]> {
  if (fontCache) return fontCache;

  // Google Fonts CSS2 URLs for our brand fonts
  const loaded: FontData[] = [];

  const tryFetch = async (
    url: string,
    name: string,
    weight: FontWeight,
    style: FontStyle
  ): Promise<void> => {
    try {
      const data = await fetchFont(url);
      loaded.push({ name, data, weight, style });
    } catch {
      // optional — skip if unavailable
    }
  };

  await Promise.all([
    tryFetch(
      'https://fonts.gstatic.com/s/newsreader/v20/cY9qfjOCX1hbuyalUrK49dLac06G1ZGsZBtoBCzBDXXD9JVF438w0a2pHa86.woff2',
      'Newsreader', 400, 'normal'
    ),
    tryFetch(
      'https://fonts.gstatic.com/s/newsreader/v20/cY9qfjOCX1hbuyalUrK49dLac06G1ZGsZBtoBCzBDXXD9JVF438w0a2pHa8yHa86.woff2',
      'Newsreader', 400, 'italic'
    ),
    tryFetch(
      'https://fonts.gstatic.com/s/newsreader/v20/cY9qfjOCX1hbuyalUrK49dLac06G1ZGsZBtoBCzBDXXD9JVF438w0a2pHe84Ha86.woff2',
      'Newsreader', 600, 'normal'
    ),
    tryFetch(
      'https://fonts.gstatic.com/s/ibmplexmono/v19/-F6qfjptAgt5VM-kVkqdyU8n1ioSflV1gMoW.woff2',
      'IBM Plex Mono', 400, 'normal'
    ),
  ]);

  fontCache = loaded;
  return fontCache;
}

// ── Render ────────────────────────────────────────────────────────────────────

export async function renderCard(brief: DesignBrief, slideIndex?: number): Promise<Buffer> {
  const fonts = await getFonts();
  const { width, height } = brief.template === 'debate_split'
    ? DIMENSIONS.landscape
    : DIMENSIONS[brief.dimensions];

  const element = renderTemplate(brief, slideIndex);

  const svg = await satori(element, {
    width,
    height,
    fonts,
  });

  const png = await sharp(Buffer.from(svg)).png({ quality: 95 }).toBuffer();
  return png;
}

// ── Batch render for carousels ────────────────────────────────────────────────

export async function renderAllSlides(brief: DesignBrief): Promise<Buffer[]> {
  if (brief.template !== 'carousel_slide' || !brief.slides?.length) {
    return [await renderCard(brief)];
  }

  const buffers: Buffer[] = [];
  for (let i = 0; i < brief.slides.length; i++) {
    buffers.push(await renderCard(brief, i));
  }
  return buffers;
}
