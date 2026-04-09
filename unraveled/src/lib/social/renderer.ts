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
import { readFileSync } from 'fs';
import { join } from 'path';
import type { DesignBrief } from './art-director-agent';
import { renderTemplate, renderImageHeroTemplate, DIMENSIONS } from './templates';

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

  // Note: Satori requires TTF/OTF, not woff2.
  // These are static latin-subset TTFs from Google Fonts (v26/v20).
  await Promise.all([
    tryFetch(
      'https://fonts.gstatic.com/s/newsreader/v26/cY9qfjOCX1hbuyalUrK49dLac06G1ZGsZBtoBCzBDXXD9JVF438weI_ADA.ttf',
      'Newsreader', 400, 'normal'
    ),
    tryFetch(
      'https://fonts.gstatic.com/s/newsreader/v26/cY9kfjOCX1hbuyalUrK439vogqC9yFZCYg7oRYaIP4obnf7fTXglsMwoT-ZA.ttf',
      'Newsreader', 400, 'italic'
    ),
    tryFetch(
      'https://fonts.gstatic.com/s/newsreader/v26/cY9qfjOCX1hbuyalUrK49dLac06G1ZGsZBtoBCzBDXXD9JVF438wpojADA.ttf',
      'Newsreader', 600, 'normal'
    ),
    tryFetch(
      'https://fonts.gstatic.com/s/ibmplexmono/v20/-F63fjptAgt5VM-kVkqdyU8n5ig.ttf',
      'IBM Plex Mono', 400, 'normal'
    ),
  ]);

  if (loaded.length === 0) {
    throw new Error('All font fetches failed — cannot render card without at least one font');
  }

  fontCache = loaded;
  return fontCache;
}

// ── Logo asset ───────────────────────────────────────────────────────────────

let logoCache: string | null = null;

function getLogoDataUri(): string {
  if (logoCache) return logoCache;
  const filePath = join(process.cwd(), 'public', 'logos', 'unraveled_truth_white_circle.svg');
  const svg = readFileSync(filePath, 'utf8');
  logoCache = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  return logoCache;
}

// ── Render ────────────────────────────────────────────────────────────────────

export async function renderCard(brief: DesignBrief, slideIndex?: number): Promise<Buffer> {
  const fonts = await getFonts();
  const { width, height } = brief.template === 'debate_split'
    ? DIMENSIONS.landscape
    : DIMENSIONS[brief.dimensions];

  const logoDataUri = getLogoDataUri();
  const element = renderTemplate(brief, slideIndex, logoDataUri);

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

// ── ComfyUI background compositing ───────────────────────────────────────────

/**
 * Renders the ImageHeroTemplate (transparent bg) as a PNG overlay, then
 * composites it over the ComfyUI-generated background buffer using Sharp.
 *
 * Result: full editorial card with photorealistic background + brand typography.
 */
export async function compositeWithBackground(
  backgroundBuffer: Buffer,
  brief: DesignBrief,
): Promise<Buffer> {
  const fonts = await getFonts();
  const { width, height } = brief.dimensions === 'landscape'
    ? DIMENSIONS.landscape
    : DIMENSIONS.square;

  // Render text overlay with transparent background
  const logoDataUri = getLogoDataUri();
  const overlayElement = renderImageHeroTemplate(brief, logoDataUri);
  const svg = await satori(overlayElement, { width, height, fonts });
  const overlayBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  // Composite: resize background to card dimensions, layer overlay on top
  return sharp(backgroundBuffer)
    .resize(width, height, { fit: 'cover', position: 'centre' })
    .composite([{ input: overlayBuffer, blend: 'over' }])
    .png({ quality: 95 })
    .toBuffer();
}

