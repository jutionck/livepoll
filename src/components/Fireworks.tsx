'use client';

import { useMemo } from 'react';

const COLORS = ['#fbbf24', '#f97316', '#38bdf8', '#22c55e', '#a78bfa', '#f472b6', '#f8fafc'];

interface BurstParticle {
  dx: number;
  dy: number;
  color: string;
  delay: number;
  dur: number;
  size: number;
  rot: number;
}

interface Burst {
  cx: number;
  cy: number;
  delay: number;
  particles: BurstParticle[];
}

interface FireworksProps {
  size?: number;
}

const random = (min: number, max: number) => min + Math.random() * (max - min);

export const Fireworks: React.FC<FireworksProps> = ({ size = 2 }) => {
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const bursts = useMemo<Burst[]>(() => {
    const groups: Burst[] = [];
    const burstCount = size >= 3 ? 3 : size === 2 ? 2 : 1;

    for (let b = 0; b < burstCount; b++) {
      const cx = random(30, 70);
      const cy = random(25, 60);
      const particles = Array.from({ length: 20 + b * 6 }, (_, i) => {
        const angle = (i / 20) * Math.PI * 2 + random(-0.3, 0.3);
        const dist = random(0.4, 1) * (250 + size * 50);
        return {
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist,
          color: COLORS[Math.floor(random(0, COLORS.length))],
          delay: random(0, 0.12),
          dur: random(0.9, 1.5),
          size: random(5, 11),
          rot: random(200, 720),
        };
      });
      groups.push({ cx, cy, delay: b * 0.22, particles });
    }

    return groups;
  }, [size]);

  if (prefersReducedMotion) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {bursts.map((burst, i) => (
        <div key={i}>
          <div
            className="absolute rounded-full"
            style={{
              left: `${burst.cx}%`,
              top: `${burst.cy}%`,
              width: 12,
              height: 12,
              backgroundColor: '#fffbeb',
              boxShadow: '0 0 12px 4px rgba(251, 191, 36, 0.9)',
              animation: `firework-flash 0.5s ease-out ${burst.delay}s both`,
            }}
          />
          {burst.particles.map((p, pi) => (
            <span
              key={pi}
              className="absolute rounded-full"
              style={
                {
                  left: `${burst.cx}%`,
                  top: `${burst.cy}%`,
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                  boxShadow: `0 0 6px ${p.color}`,
                  animation: `firework-particle ${p.dur}s cubic-bezier(0.15, 0.6, 0.45, 1) ${burst.delay + p.delay}s forwards`,
                  '--dx': `${p.dx}px`,
                  '--dy': `${p.dy}px`,
                  '--rot': `${p.rot}deg`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
};
