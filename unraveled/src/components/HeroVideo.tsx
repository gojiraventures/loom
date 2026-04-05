'use client';

import { useEffect, useRef, useState } from 'react';

type Phase = 'playing' | 'fading' | 'done';

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>('playing');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // React doesn't reliably apply the `muted` prop as a DOM property,
    // which causes browsers to block autoplay on production. Set it explicitly.
    video.muted = true;
    video.play().catch(() => {
      // Autoplay still blocked (e.g. data-saver mode) — skip straight to done
      setPhase('done');
    });

    const handleEnded = () => setPhase('fading');
    video.addEventListener('ended', handleEnded);
    return () => video.removeEventListener('ended', handleEnded);
  }, []);

  // After fade completes, collapse the section then remove it
  useEffect(() => {
    if (phase !== 'fading') return;
    // opacity transition is 1.2s, then allow 300ms for height collapse
    const t = setTimeout(() => setPhase('done'), 1500);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === 'done') return null;

  const isFading = phase === 'fading';

  return (
    <section
      className="relative overflow-hidden border-b border-border"
      style={{
        aspectRatio: isFading ? undefined : '16/7',
        maxHeight: isFading ? 0 : undefined,
        opacity: isFading ? 0 : 1,
        transition: isFading
          ? 'opacity 1.2s ease-in-out, max-height 0.3s ease-out 1.2s'
          : undefined,
      }}
    >
      <video
        ref={videoRef}
        src="/hero.mp4"
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />
    </section>
  );
}
