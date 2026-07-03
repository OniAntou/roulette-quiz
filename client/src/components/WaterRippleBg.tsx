import React, { useEffect, useRef } from 'react';
import { useTheme } from '../theme/ThemeContext';

interface WaterRippleBgProps {
  className?: string;
  overlayOpacity?: number;
  mode?: 'cursor' | 'ambient';
}

export function WaterRippleBg({ className = '', overlayOpacity = 0.88, mode = 'cursor' }: WaterRippleBgProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stampsRef = useRef<{ x: number; y: number; born: number; rmax: number; seed: number }[]>([]);
  const lastMouseRef = useRef<{ x: number; y: number } | null>(null);
  const animFrameRef = useRef<number>(0);
  const { theme } = useTheme();
  const themeRef = useRef(theme);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    stampsRef.current = [];
    lastMouseRef.current = null;

    const R_START = 2;
    const R_END = 120;
    const R_VARY = 0.4;
    const LIFETIME = mode === 'ambient' ? 2000 : 1200;
    const STAMP_STEP = 10;
    const MAX_STAMPS = 60;

    const easeOutExpo = (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    const easeInOutQuad = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    let w = 0, h = 0;
    let mountedAt = performance.now();
    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * devicePixelRatio;
      canvas.height = h * devicePixelRatio;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const addStamp = (x: number, y: number) => {
      if (stampsRef.current.length >= MAX_STAMPS) stampsRef.current.shift();
      stampsRef.current.push({
        x, y,
        born: performance.now(),
        rmax: R_END * (1 - R_VARY + Math.random() * R_VARY),
        seed: Math.random() * Math.PI * 2,
      });
    };

    const stampAlong = (x: number, y: number) => {
      const last = lastMouseRef.current;
      if (!last) { addStamp(x, y); }
      else {
        const dx = x - last.x, dy = y - last.y;
        const dist = Math.hypot(dx, dy);
        const steps = Math.max(1, Math.ceil(dist / STAMP_STEP));
        for (let i = 1; i <= steps; i++) {
          addStamp(last.x + (dx * i) / steps, last.y + (dy * i) / steps);
        }
      }
      lastMouseRef.current = { x, y };
    };

    const carve = (x: number, y: number, r: number, alpha: number, seed: number, now: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,255,255,${alpha})`);
      g.addColorStop(0.2, `rgba(255,255,255,${0.85 * alpha})`);
      g.addColorStop(0.35, `rgba(255,255,255,${0.35 * alpha})`);
      g.addColorStop(0.5, `rgba(255,255,255,${0.7 * alpha})`);
      g.addColorStop(0.65, `rgba(255,255,255,${0.25 * alpha})`);
      g.addColorStop(0.82, `rgba(255,255,255,${0.5 * alpha})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;

      ctx.beginPath();
      const segs = 48;
      const wavePhase = (now - mountedAt) * 0.002;
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        const n1 = Math.sin(a * 5 + seed + wavePhase) * 0.09;
        const n2 = Math.sin(a * 12 + seed * 2.3 + wavePhase * 1.8) * 0.04;
        const n3 = Math.sin(a * 25 + seed * 0.6 + wavePhase * 0.6) * 0.02;
        const wob = 0.84 + n1 + n2 + n3;
        const rr = r * wob;
        const px = x + Math.cos(a) * rr;
        const py = y + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    };

    let running = false;
    const loop = () => {
      const now = performance.now();
      ctx.clearRect(0, 0, w, h);

      if (stampsRef.current.length > 0) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = themeRef.current === 'light'
          ? `rgba(245,245,245,${overlayOpacity})`
          : `rgba(10,10,10,${overlayOpacity})`;
        ctx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = 'destination-out';
        for (let i = stampsRef.current.length - 1; i >= 0; i--) {
          const s = stampsRef.current[i];
          const t = (now - s.born) / LIFETIME;
          if (t >= 1) { stampsRef.current.splice(i, 1); continue; }
          const ease = easeOutExpo(t);
          const r = R_START + (s.rmax - R_START) * ease;
          const alpha = t < 0.3 ? 1 : 1 - easeInOutQuad((t - 0.3) / 0.7);
          carve(s.x, s.y, r, Math.max(0, alpha), s.seed, now);
        }
      }

      if (stampsRef.current.length) {
        animFrameRef.current = requestAnimationFrame(loop);
      } else {
        running = false;
      }
    };

    const start = () => {
      if (!running) { running = true; animFrameRef.current = requestAnimationFrame(loop); }
    };

    // Ambient mode: auto-generate ripples at random positions
    let ambientInterval: ReturnType<typeof setInterval> | undefined;
    if (mode === 'ambient') {
      const spawnAmbientRipple = () => {
        if (w === 0 || h === 0) return;
        const x = Math.random() * w;
        const y = Math.random() * h;
        addStamp(x, y);
        start();
      };
      // Spawn initial batch so it's not empty
      for (let i = 0; i < 3; i++) {
        setTimeout(spawnAmbientRipple, i * 300);
      }
      ambientInterval = setInterval(spawnAmbientRipple, 600 + Math.random() * 400);
    }

    // Cursor mode: mouse listeners
    if (mode === 'cursor') {
      const onMouseMove = (e: MouseEvent) => {
        if (performance.now() - mountedAt < 100) return;
        const rect = canvas.getBoundingClientRect();
        stampAlong(e.clientX - rect.left, e.clientY - rect.top);
        start();
      };

      const onMouseLeave = () => { lastMouseRef.current = null; };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseleave', onMouseLeave);

      return () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseleave', onMouseLeave);
        window.removeEventListener('resize', resize);
        cancelAnimationFrame(animFrameRef.current);
        clearInterval(ambientInterval);
        stampsRef.current = [];
        lastMouseRef.current = null;
      };
    }

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animFrameRef.current);
      clearInterval(ambientInterval);
      stampsRef.current = [];
      lastMouseRef.current = null;
    };
  }, [overlayOpacity, mode]);

  return <canvas ref={canvasRef} className={className} />;
}
