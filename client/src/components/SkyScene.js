import { useEffect, useRef } from 'react';
import { conditionGroup } from '../lib/weather';

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Rain / snow / stars drawn on a canvas sized to the hero. */
function useParticles(canvasRef, flashRef, kind, night) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.getContext) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    const still = reducedMotion();

    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const rand = (a, b) => a + Math.random() * (b - a);
    let parts = [];
    const wet = kind === 'rain' || kind === 'storm' || kind === 'drizzle';
    if (wet) {
      const n = kind === 'drizzle' ? 90 : 200;
      parts = Array.from({ length: n }, () => ({
        x: rand(-0.2, 1.2) * w, y: rand(0, 1) * h,
        len: rand(8, kind === 'drizzle' ? 12 : 22), v: rand(9, 16), a: rand(0.15, 0.4),
      }));
    } else if (kind === 'snow') {
      parts = Array.from({ length: 140 }, () => ({
        x: rand(0, 1) * w, y: rand(0, 1) * h, r: rand(1, 3.6),
        v: rand(0.4, 1.4), drift: rand(-0.4, 0.4), a: rand(0.5, 0.95), wob: rand(0, 6.3),
      }));
    } else if (night && (kind === 'clear' || kind === 'partly')) {
      parts = Array.from({ length: 160 }, () => ({
        x: rand(0, 1) * w, y: rand(0, 0.62) * h, r: rand(0.3, 1.4),
        a: rand(0.25, 0.9), tw: rand(0, 6.3), ts: rand(0.005, 0.025),
      }));
    }

    const rainColor = night ? '200,214,230' : '58,84,96';
    let frame;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      parts.forEach((p) => {
        if (wet) {
          ctx.strokeStyle = `rgba(${rainColor},${p.a})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.len * 0.18, p.y + p.len);
          ctx.stroke();
          p.y += p.v;
          p.x -= p.v * 0.18;
          if (p.y > h + 20) { p.y = -20; p.x = rand(-0.2, 1.2) * w; }
        } else if (kind === 'snow') {
          p.wob += 0.02;
          ctx.fillStyle = `rgba(255,255,255,${p.a})`;
          ctx.beginPath();
          ctx.arc(p.x + Math.sin(p.wob) * 2, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          p.y += p.v;
          p.x += p.drift;
          if (p.y > h + 10) { p.y = -10; p.x = rand(0, 1) * w; }
        } else {
          p.tw += p.ts;
          ctx.fillStyle = `rgba(255,255,255,${p.a * (0.55 + 0.45 * Math.sin(p.tw))})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      if (!still) frame = requestAnimationFrame(draw);
    };
    draw();

    let bolt;
    const flash = flashRef.current;
    if (kind === 'storm' && flash && !still) {
      const strike = () => {
        flash.classList.add('is-on');
        setTimeout(() => flash.classList.remove('is-on'), 90);
        setTimeout(() => {
          flash.classList.add('is-on');
          setTimeout(() => flash.classList.remove('is-on'), 60);
        }, 180);
        bolt = setTimeout(strike, rand(3500, 8000));
      };
      bolt = setTimeout(strike, 1800);
    }

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(bolt);
      window.removeEventListener('resize', resize);
    };
  }, [canvasRef, flashRef, kind, night]);
}

function Hills({ night }) {
  return (
    <svg className="sky__hills" viewBox="0 0 1440 360" preserveAspectRatio="none" aria-hidden="true">
      <path className="hill hill--far" d="M0 190 C 180 130 330 150 480 175 S 800 120 980 150 S 1300 190 1440 140 V360 H0Z" />
      <path className="hill hill--mid" d="M0 250 C 220 190 400 215 600 235 S 980 185 1160 210 S 1360 245 1440 225 V360 H0Z" />
      <path className="hill hill--near" d="M0 300 C 260 262 520 285 760 300 S 1200 268 1440 290 V360 H0Z" />
      {!night && <circle className="hill__glint" cx="1180" cy="214" r="2" />}
    </svg>
  );
}

const CLOUDS = [
  { top: '14%', left: '6%', scale: 1.1, dur: 90 },
  { top: '24%', left: '58%', scale: 1.4, dur: 120 },
  { top: '8%', left: '34%', scale: 0.8, dur: 75 },
  { top: '33%', left: '18%', scale: 1.25, dur: 105 },
  { top: '18%', left: '78%', scale: 0.9, dur: 95 },
  { top: '38%', left: '64%', scale: 1.1, dur: 115 },
];

export default function SkyScene({ weather }) {
  const canvasRef = useRef(null);
  const flashRef = useRef(null);

  const id = weather?.weather[0].id ?? 800;
  const kind = weather ? conditionGroup(id) : 'clear';
  const night = weather
    ? weather.dt < weather.sys.sunrise || weather.dt >= weather.sys.sunset
    : false;
  const cover = weather ? weather.clouds.all : 20;
  const cloudCount = kind === 'clear' ? 1 : Math.max(2, Math.round((cover / 100) * CLOUDS.length));
  const gloomy = ['storm', 'rain', 'drizzle', 'snow', 'cloudy', 'fog'].includes(kind);

  useParticles(canvasRef, flashRef, kind, night);

  return (
    <div className={`sky sky--${kind}${night ? ' is-night' : ''}${gloomy ? ' is-gloomy' : ''}`} aria-hidden="true">
      <div className="sky__layer sky__layer--day" />
      <div className="sky__layer sky__layer--night" />
      <div className="sky__orb" />
      <div className="sky__clouds">
        {CLOUDS.slice(0, cloudCount).map((c, i) => (
          <span
            key={i}
            className="cloud"
            style={{ top: c.top, left: c.left, '--s': c.scale, '--dur': `${c.dur}s`, '--delay': `${-i * 13}s` }}
          />
        ))}
      </div>
      <canvas ref={canvasRef} className="sky__canvas" />
      <Hills night={night} />
      <div className="sky__fog" />
      <div className="sky__fade sky__fade--top" />
      <div className="sky__fade sky__fade--bottom" />
      <div ref={flashRef} className="sky__flash" />
    </div>
  );
}
