'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface VisualLayer {
  kind: 'image' | 'video' | 'none';
  url?: string;
  opacity?: number;
  layout?: 'fill' | 'center' | 'left' | 'right';
}

interface CrossDissolveBackgroundProps {
  visual: VisualLayer | null;
  defaultGradient: string;
  duration?: number;
  overlayClass?: string;
  className?: string;
}

function getBackgroundSize(layout: string) {
  switch (layout) {
    case 'center':
    case 'left':
    case 'right':
      return 'contain';
    default:
      return 'cover';
  }
}

function getBackgroundPosition(layout: string) {
  switch (layout) {
    case 'left': return 'left center';
    case 'right': return 'right center';
    default: return 'center';
  }
}

function visualKey(v: VisualLayer | null): string {
  if (!v || v.kind === 'none') return 'gradient';
  return `${v.kind}:${v.url || ''}`;
}

function VisualRenderer({ visual, gradient, className = '' }: { visual: VisualLayer | null; gradient: string; className?: string }) {
  const opacity = ((visual?.opacity ?? 100) / 100);
  const layout = visual?.layout || 'fill';

  if (!visual || visual.kind === 'none') {
    return <div className={`absolute inset-0 ${className}`} style={{ background: gradient }} />;
  }

  if (visual.kind === 'video' && visual.url) {
    return (
      <>
        <video
          key={visual.url}
          src={visual.url}
          autoPlay
          loop
          muted
          playsInline
          className={`absolute inset-0 w-full h-full object-cover ${className}`}
          style={{ opacity }}
        />
      </>
    );
  }

  if (visual.kind === 'image' && visual.url) {
    return (
      <div
        className={`absolute inset-0 w-full h-full ${className}`}
        style={{
          backgroundImage: `url(${visual.url})`,
          backgroundSize: getBackgroundSize(layout),
          backgroundPosition: getBackgroundPosition(layout),
          backgroundRepeat: 'no-repeat',
          opacity,
        }}
      />
    );
  }

  return <div className={`absolute inset-0 ${className}`} style={{ background: gradient }} />;
}

export function CrossDissolveBackground({
  visual,
  defaultGradient,
  duration = 500,
  overlayClass = 'bg-black/40',
  className = '',
}: CrossDissolveBackgroundProps) {
  const [layers, setLayers] = useState<{ id: number; visual: VisualLayer | null; entering: boolean }[]>([
    { id: 0, visual, entering: false },
  ]);
  const idCounter = useRef(1);
  const prevKeyRef = useRef(visualKey(visual));
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const newKey = visualKey(visual);
    if (newKey === prevKeyRef.current) return;
    prevKeyRef.current = newKey;

    if (prefersReducedMotion) {
      setLayers([{ id: idCounter.current++, visual, entering: false }]);
      return;
    }

    const newId = idCounter.current++;
    setLayers(prev => [...prev, { id: newId, visual, entering: true }]);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setLayers(prev => prev.map(l => l.id === newId ? { ...l, entering: false } : l));
      });
    });

    const timeout = setTimeout(() => {
      setLayers(prev => {
        if (prev.length <= 1) return prev;
        return prev.filter((_, i) => i === prev.length - 1);
      });
    }, duration + 50);

    return () => clearTimeout(timeout);
  }, [visual?.kind, visual?.url, visual?.opacity, visual?.layout, duration, prefersReducedMotion]);

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {layers.map((layer, i) => {
        const isLast = i === layers.length - 1;
        const shouldFadeOut = !isLast && layers.length > 1;

        return (
          <div
            key={layer.id}
            className="absolute inset-0"
            style={{
              opacity: layer.entering ? 0 : shouldFadeOut ? 0 : 1,
              transition: prefersReducedMotion ? 'none' : `opacity ${duration}ms ease-in-out`,
              zIndex: i,
            }}
          >
            <VisualRenderer visual={layer.visual} gradient={defaultGradient} />
          </div>
        );
      })}
      <div className={`absolute inset-0 ${overlayClass}`} style={{ zIndex: layers.length }} />
    </div>
  );
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return reduced;
}

export { useReducedMotion };
export type { VisualLayer };
