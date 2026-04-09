/**
 * Satori-compatible social card templates.
 *
 * All components use ONLY inline styles (Satori does not support class-based CSS).
 * Flexbox layout only. No shadows, gradients beyond 2-stop, or complex CSS.
 *
 * Brand constants are inlined — do not import from globals.css (not available at render time).
 */

import React from 'react';
import type { DesignBrief } from './art-director-agent';

// ── Brand tokens ──────────────────────────────────────────────────────────────

// Brand tokens — matches UnraveledTruth Official Art Direction & Visual Style Guide
const C = {
  bg:           '#111111',       // deep charcoal near-black
  bgLight:      '#181818',       // slightly lighter for carousel secondary slides
  gold:         '#C9A66B',       // warm antique gold-beige (primary accent)
  goldBright:   '#D4B483',       // lighter gold for large display numerals
  teal:         '#2A5C5E',       // muted teal (supporting)
  textPrimary:  '#F5F0E8',       // warm off-white / cream
  textSecondary:'rgba(245,240,232,0.55)',
  textTertiary: 'rgba(245,240,232,0.28)',
  border:       'rgba(245,240,232,0.07)',
} as const;

// Square: 1080×1080  |  Landscape: 1200×675
export const DIMENSIONS = {
  square:    { width: 1080, height: 1080 },
  landscape: { width: 1200, height: 675 },
};

// ── Shared primitives ─────────────────────────────────────────────────────────

function Rule({ color = C.gold, opacity = 0.4 }: { color?: string; opacity?: number }) {
  return (
    <div style={{
      width: '100%',
      height: 1,
      backgroundColor: color,
      opacity,
    }} />
  );
}

// Logo aspect ratio from viewBox "0 0 693.99 137.35"
const LOGO_ASPECT = 693.99 / 137.35; // ≈ 5.051
const LOGO_HEIGHT = 40;
const LOGO_WIDTH = Math.round(LOGO_HEIGHT * LOGO_ASPECT); // 202

function BrandMark({ logoDataUri }: { logoDataUri?: string }) {
  if (logoDataUri) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoDataUri}
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        alt="UnraveledTruth"
        style={{ display: 'flex' }}
      />
    );
  }
  // Fallback: text pill when logo unavailable
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      backgroundColor: C.gold,
      paddingLeft: 14,
      paddingRight: 14,
      paddingTop: 6,
      paddingBottom: 6,
    }}>
      <span style={{
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: 15,
        letterSpacing: '0.16em',
        textTransform: 'uppercase' as const,
        color: '#1A1712',
        fontWeight: 600,
      }}>
        UNRAVELEDTRUTH.COM
      </span>
    </div>
  );
}

function MonoLabel({ children, color = C.textTertiary }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      fontFamily: '"IBM Plex Mono", monospace',
      fontSize: 16,
      letterSpacing: '0.14em',
      textTransform: 'uppercase' as const,
      color,
    }}>
      {children}
    </span>
  );
}

// ── Score Reveal ──────────────────────────────────────────────────────────────

export function ScoreRevealTemplate({ brief, logoDataUri }: { brief: DesignBrief; logoDataUri?: string }) {
  const { width, height } = DIMENSIONS[brief.dimensions];
  const traditions = brief.traditions ?? [];
  const accent = brief.accent_color;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width,
      height,
      backgroundColor: C.bg,
      padding: 80,
      justifyContent: 'space-between',
    }}>
      {/* Top: brand mark */}
      <BrandMark logoDataUri={logoDataUri} />

      {/* Center: headline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'flex-start' }}>
        {brief.headline && (
          <div style={{
            fontFamily: '"Newsreader", Georgia, serif',
            fontSize: brief.dimensions === 'square' ? 72 : 56,
            fontWeight: 600,
            lineHeight: 1.1,
            color: C.textPrimary,
            maxWidth: 860,
          }}>
            {brief.headline}
          </div>
        )}
        {brief.subheadline && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Rule color={accent} opacity={0.3} />
            <div style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 22,
              color: C.textSecondary,
              letterSpacing: '0.04em',
              maxWidth: 760,
            }}>
              {brief.subheadline}
            </div>
          </div>
        )}
      </div>

      {/* Bottom: traditions */}
      {traditions.length > 0 && (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' as const }}>
          {traditions.slice(0, 6).map((t, i) => (
            <MonoLabel key={i} color={C.textSecondary}>{t}</MonoLabel>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Quote Card ────────────────────────────────────────────────────────────────

export function QuoteCardTemplate({ brief, logoDataUri }: { brief: DesignBrief; logoDataUri?: string }) {
  const { width, height } = DIMENSIONS[brief.dimensions];
  const accent = brief.accent_color;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width,
      height,
      backgroundColor: C.bg,
      padding: 80,
      justifyContent: 'space-between',
    }}>
      {/* Top accent bar */}
      <div style={{ width: 48, height: 3, backgroundColor: accent }} />

      {/* Main quote */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div style={{
          fontFamily: '"Newsreader", Georgia, serif',
          fontSize: brief.dimensions === 'square' ? 56 : 44,
          fontWeight: 400,
          fontStyle: 'italic' as const,
          lineHeight: 1.3,
          color: C.textPrimary,
          maxWidth: brief.dimensions === 'square' ? 900 : 960,
        }}>
          {`"${brief.headline}"`}
        </div>

        {brief.subheadline && (
          <div style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 20,
            color: C.textSecondary,
            letterSpacing: '0.06em',
          }}>
            {brief.subheadline}
          </div>
        )}

        {brief.body_copy && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Rule color={accent} opacity={0.3} />
            <div style={{
              fontFamily: '"Newsreader", Georgia, serif',
              fontSize: 26,
              color: C.textSecondary,
              lineHeight: 1.5,
              maxWidth: 800,
            }}>
              {brief.body_copy}
            </div>
          </div>
        )}
      </div>

      <BrandMark logoDataUri={logoDataUri} />
    </div>
  );
}

// ── Carousel Slide ────────────────────────────────────────────────────────────

export function CarouselSlideTemplate({ brief, slideIndex = 0, logoDataUri }: { brief: DesignBrief; slideIndex?: number; logoDataUri?: string }) {
  const { width, height } = DIMENSIONS[brief.dimensions];
  const slides = brief.slides ?? [];
  const slide = slides[slideIndex];
  const isFirst = slideIndex === 0;
  const isLast = slideIndex === slides.length - 1;
  const accent = slide?.accent_color ?? brief.accent_color;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width,
      height,
      backgroundColor: isFirst ? C.bg : C.bgLight,
      padding: 72,
      justifyContent: 'space-between',
      borderLeft: slideIndex > 0 ? `3px solid ${C.border}` : 'none',
    }}>
      {/* Slide counter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <MonoLabel color={accent}>{isFirst ? 'Overview' : slide?.header ?? `Finding ${slideIndex}`}</MonoLabel>
        <MonoLabel color={C.textTertiary}>{`${slideIndex + 1} / ${slides.length || 1}`}</MonoLabel>
      </div>

      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28, flex: 1, justifyContent: 'center' }}>
        {isFirst && brief.headline && (
          <div style={{
            fontFamily: '"Newsreader", Georgia, serif',
            fontSize: 64,
            fontWeight: 600,
            lineHeight: 1.1,
            color: C.textPrimary,
            maxWidth: 860,
          }}>
            {brief.headline}
          </div>
        )}

        {isFirst && brief.subheadline && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Rule color={accent} opacity={0.35} />
            <div style={{
              fontFamily: '"Newsreader", Georgia, serif',
              fontSize: 30,
              color: C.textSecondary,
              lineHeight: 1.4,
            }}>
              {brief.subheadline}
            </div>
          </div>
        )}

        {!isFirst && slide && (
          <div style={{
            fontFamily: '"Newsreader", Georgia, serif',
            fontSize: 44,
            lineHeight: 1.3,
            color: C.textPrimary,
            maxWidth: 900,
          }}>
            {slide.body}
          </div>
        )}
      </div>

      {/* Bottom */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <BrandMark logoDataUri={logoDataUri} />
        {isLast && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MonoLabel color={accent}>unraveledtruth.com</MonoLabel>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Debate Split ──────────────────────────────────────────────────────────────

export function DebateSplitTemplate({ brief, logoDataUri }: { brief: DesignBrief; logoDataUri?: string }) {
  const { width, height } = DIMENSIONS.landscape; // always landscape
  const advocateColor = '#6AADAD'; // teal
  const skepticColor  = '#C47A6E'; // warm red

  // brief.headline = advocate summary, brief.subheadline = skeptic summary
  const advocateText = brief.headline;
  const skepticText  = brief.subheadline ?? brief.body_copy ?? '';

  return (
    <div style={{
      display: 'flex',
      width,
      height,
      backgroundColor: C.bg,
    }}>
      {/* Advocate side */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        padding: 56,
        justifyContent: 'space-between',
        borderRight: `1px solid ${C.border}`,
      }}>
        <MonoLabel color={advocateColor}>Advocate</MonoLabel>
        <div style={{
          fontFamily: '"Newsreader", Georgia, serif',
          fontSize: 32,
          lineHeight: 1.35,
          color: C.textPrimary,
          maxWidth: 480,
        }}>
          {advocateText}
        </div>
        <div style={{ width: 32, height: 3, backgroundColor: advocateColor }} />
      </div>

      {/* Divider */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
        <div style={{ width: 1, flex: 1, backgroundColor: C.border }} />
        <div style={{
          fontFamily: '"Newsreader", Georgia, serif',
          fontSize: 28,
          color: C.textTertiary,
          padding: '16px 0',
          fontStyle: 'italic' as const,
        }}>
          vs
        </div>
        <div style={{ width: 1, flex: 1, backgroundColor: C.border }} />
      </div>

      {/* Skeptic side */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        padding: 56,
        justifyContent: 'space-between',
      }}>
        <MonoLabel color={skepticColor}>Skeptic</MonoLabel>
        <div style={{
          fontFamily: '"Newsreader", Georgia, serif',
          fontSize: 32,
          lineHeight: 1.35,
          color: C.textPrimary,
          maxWidth: 480,
        }}>
          {skepticText}
        </div>
        <BrandMark logoDataUri={logoDataUri} />
      </div>
    </div>
  );
}

// ── Thread Header / Announcement ──────────────────────────────────────────────

export function AnnouncementTemplate({ brief, logoDataUri }: { brief: DesignBrief; logoDataUri?: string }) {
  const isLandscape = brief.dimensions === 'landscape';
  const { width, height } = DIMENSIONS[brief.dimensions];
  const accent = brief.accent_color;
  const headlineFontSize = isLandscape ? 60 : 72;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width,
      height,
      backgroundColor: C.bg,
      padding: isLandscape ? 64 : 80,
      justifyContent: 'space-between',
    }}>
      {/* Top: mono label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: accent }} />
        <MonoLabel color={accent}>New Research — UnraveledTruth</MonoLabel>
      </div>

      {/* Center: headline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div style={{
          fontFamily: '"Newsreader", Georgia, serif',
          fontSize: headlineFontSize,
          fontWeight: 600,
          lineHeight: 1.1,
          color: C.textPrimary,
          maxWidth: isLandscape ? 960 : 900,
        }}>
          {brief.headline}
        </div>

        {brief.subheadline && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Rule color={accent} opacity={0.3} />
            <div style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 22,
              color: C.textSecondary,
              letterSpacing: '0.04em',
              maxWidth: 760,
            }}>
              {brief.subheadline}
            </div>
          </div>
        )}

      </div>

      {/* Bottom: traditions + brand mark */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <BrandMark logoDataUri={logoDataUri} />
        {brief.traditions && brief.traditions.length > 0 && (
          <div style={{ display: 'flex', gap: 20 }}>
            {brief.traditions.slice(0, 5).map((t, i) => (
              <MonoLabel key={i} color={C.textTertiary}>{t}</MonoLabel>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Image Hero ────────────────────────────────────────────────────────────────
// Used when a ComfyUI background image is composited underneath.
// Renders with a transparent background — Sharp composites this over the image buffer.
// Dark gradient scrim covers the bottom 60% for text contrast.

export function ImageHeroTemplate({ brief, logoDataUri }: { brief: DesignBrief; logoDataUri?: string }) {
  const isLandscape = brief.dimensions === 'landscape';
  const { width, height } = isLandscape ? DIMENSIONS.landscape : DIMENSIONS.square;
  const accent = brief.accent_color;
  const headlineFontSize = isLandscape ? 56 : 68;
  const padding = isLandscape ? 64 : 72;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width,
      height,
      backgroundColor: 'transparent',
      position: 'relative',
    }}>
      {/* Dark gradient scrim — transparent top → near-black bottom */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: Math.round(height * 0.62),
        backgroundImage: 'linear-gradient(rgba(0,0,0,0) 0%, rgba(10,10,10,0.97) 55%)',
        display: 'flex',
      }} />

      {/* Text layer — positioned at bottom */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        padding,
        gap: 18,
      }}>
        {/* Brand mark */}
        <BrandMark logoDataUri={logoDataUri} />

        {/* Headline */}
        <div style={{
          fontFamily: '"Newsreader", Georgia, serif',
          fontSize: headlineFontSize,
          fontWeight: 600,
          lineHeight: 1.1,
          color: C.textPrimary,
          maxWidth: isLandscape ? 980 : 920,
        }}>
          {brief.headline}
        </div>

        {/* Subheadline */}
        {brief.subheadline && (
          <div style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 19,
            color: C.textSecondary,
            letterSpacing: '0.04em',
            maxWidth: 780,
          }}>
            {brief.subheadline}
          </div>
        )}

        {/* Bottom rule */}
        <div style={{ width: '100%', height: 1, backgroundColor: accent, opacity: 0.2, marginTop: 4 }} />
      </div>
    </div>
  );
}

// ── Template dispatcher ───────────────────────────────────────────────────────

export function renderTemplate(brief: DesignBrief, slideIndex?: number, logoDataUri?: string): React.ReactElement {
  switch (brief.template) {
    case 'score_reveal':
      return React.createElement(ScoreRevealTemplate, { brief, logoDataUri });
    case 'quote_card':
      return React.createElement(QuoteCardTemplate, { brief, logoDataUri });
    case 'carousel_slide':
      return React.createElement(CarouselSlideTemplate, { brief, slideIndex: slideIndex ?? 0, logoDataUri });
    case 'debate_split':
      return React.createElement(DebateSplitTemplate, { brief, logoDataUri });
    case 'thread_header':
    case 'announcement':
    default:
      return React.createElement(AnnouncementTemplate, { brief, logoDataUri });
  }
}

/** Renders the image-hero overlay variant (transparent background for compositing). */
export function renderImageHeroTemplate(brief: DesignBrief, logoDataUri?: string): React.ReactElement {
  return React.createElement(ImageHeroTemplate, { brief, logoDataUri });
}
