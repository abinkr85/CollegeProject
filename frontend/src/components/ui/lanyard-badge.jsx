import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

/**
 * Verlet integration step. `w` is inverse mass; 0 pins a point in place.
 */
function integrate(pts, dt, gravity, damping) {
  for (const p of pts) {
    if (!p.w) continue;
    const vx = (p.x - p.px) * damping;
    const vy = (p.y - p.py) * damping;
    p.px = p.x;
    p.py = p.y;
    p.x += vx;
    p.y += vy + gravity * dt * dt;
  }
}

/**
 * Relax distance constraints between rope points.
 */
function solve(pts, links, iterations) {
  for (let k = 0; k < iterations; k++) {
    for (const [i, j, rest] of links) {
      const a = pts[i];
      const b = pts[j];
      const ws = a.w + b.w;
      if (!ws) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1e-6;
      const f = (d - rest) / (d * ws);
      a.x += dx * f * a.w;
      a.y += dy * f * a.w;
      b.x -= dx * f * b.w;
      b.y -= dy * f * b.w;
    }
  }
}

/**
 * Card rotation spring step.
 */
function spinStep(s, target, dt, drive) {
  s.v += (-(s.a - target) * 18 - s.v * 3.2 + drive) * dt;
  s.a += s.v * dt;
}

/**
 * Calculate swing angle of the badge from vertical in radians.
 */
function swingAngle(top, bottom) {
  return Math.atan2(bottom.x - top.x, bottom.y - top.y);
}

const DISPLAY = '"Inter", "Oswald", -apple-system, BlinkMacSystemFont, sans-serif';
const SCRIPT = '"Segoe Script", "Brush Script MT", "Snell Roundhand", cursive';

/**
 * Draw decorative mandala on the lanyard ribbon
 */
function drawMandala(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineWidth = Math.max(0.8, r * 0.018);
  for (const k of [1, 0.9, 0.62, 0.26]) {
    ctx.beginPath();
    ctx.arc(0, 0, r * k, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 16; i++) {
    ctx.save();
    ctx.rotate((i / 16) * Math.PI * 2);
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.76, r * 0.07, r * 0.13, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.rotate(Math.PI / 16);
    ctx.beginPath();
    ctx.arc(0, -r * 0.95, r * 0.018, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/**
 * Generate printed woven strap texture canvas
 */
function makeStrap(length, width, dpr, opts) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(width * dpr));
  c.height = Math.max(1, Math.round(length * dpr));
  const ctx = c.getContext('2d');
  if (!ctx) return c;

  ctx.setTransform(0, dpr, -dpr, 0, c.width, 0);
  ctx.fillStyle = opts.color;
  ctx.fillRect(0, 0, length, width);
  ctx.strokeStyle = ctx.fillStyle = opts.ink;

  if (!opts.plain) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, length, width);
    ctx.clip();
    ctx.textBaseline = 'middle';
    const scriptFont = '600 ' + Math.round(width * 0.44) + 'px ' + DISPLAY;
    const labelFont = '700 ' + Math.round(width * 0.34) + 'px ' + DISPLAY;
    ctx.font = scriptFont;
    const scriptW = ctx.measureText(opts.text).width;
    ctx.font = labelFont;
    const labelW = ctx.measureText(opts.label).width;
    const gap = width * 0.6;
    let x = width * 0.4;
    let flip = 1;
    while (x < length) {
      ctx.globalAlpha = 0.45;
      drawMandala(ctx, x + width * 1.3, width * (0.5 + flip * 0.28), width * 1.2);
      x += width * 2.8;
      ctx.globalAlpha = 0.95;
      ctx.font = scriptFont;
      ctx.fillText(opts.text, x, width * 0.52);
      x += scriptW + gap;
      if (opts.label) {
        ctx.font = labelFont;
        ctx.fillText('•  ' + opts.label + '  •', x, width * 0.53);
        x += labelW + ctx.measureText('•    •').width + gap;
      }
      flip = -flip;
    }
    ctx.restore();
  }

  // Woven edges light catch
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 1.5);
  ctx.lineTo(length, 1.5);
  ctx.moveTo(0, width - 1.5);
  ctx.lineTo(length, width - 1.5);
  ctx.stroke();
  return c;
}

/**
 * Interactive Physics Lanyard Badge Component
 */
const LanyardBadge = forwardRef(function LanyardBadge(
  {
    front,
    back,
    strapText = 'HARSHA INSTITUTIONS',
    strapLabel = 'STUDENT IDENTITY',
    strapColor = '#1e3a8a',
    inkColor = '#fcd34d',
    cardWidth = 220,
    height = '480px',
    className = '',
    onFlipChange,
  },
  ref
) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const cardRef = useRef(null);
  const innerRef = useRef(null);

  const [showBack, setShowBack] = useState(false);
  const backRef = useRef(showBack);
  backRef.current = showBack;

  const flipRef = useRef(() => {});

  // Expose flip method to parent through ref
  useImperativeHandle(ref, () => ({
    flip: () => flipRef.current(),
    isFlipped: showBack,
  }));

  const cw = cardWidth;
  const ch = Math.round(cardWidth * 1.58); // Standard credit/ID card 1:1.58 aspect ratio
  const ringR = Math.max(7, Math.round(cw * 0.036));
  const clipH = Math.round(cw * 0.1);

  const look = useRef({ strapText, strapLabel, strapColor, inkColor });
  look.current = { strapText, strapLabel, strapColor, inkColor };
  const lookKey = [strapText, strapLabel, strapColor, inkColor].join('|');

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const card = cardRef.current;
    const inner = innerRef.current;
    const ctx = canvas?.getContext('2d');
    if (!root || !canvas || !card || !inner || !ctx) return;

    const sw = Math.max(14, Math.round(cw * 0.1)); // strap width
    const lowLen = sw * 2.2; // buckle to ring
    const arm = ringR * 2 + clipH + ch * 0.55; // ring to card center of mass
    const N = 12;

    let pts = [];
    let links = [];
    let left = [];
    let right = [];
    let low = [];
    let iB = 0;
    let iT = 0;
    let iC = 0;
    let strandRest = 1;
    let dpr = 1;
    let W = 1;
    let H = 1;
    let strapTex = null;
    let plainTex = null;
    const spin = { a: 0, v: 0 };
    let spinTarget = backRef.current ? Math.PI : 0;
    spin.a = spinTarget;

    const add = (x, y, w) => {
      pts.push({ x, y, px: x, py: y, w });
      return pts.length - 1;
    };

    const strand = (from, to, n, slack) => {
      const a = pts[from];
      const b = pts[to];
      const rest = (Math.hypot(b.x - a.x, b.y - a.y) * slack) / n;
      const ids = [from];
      for (let i = 1; i < n; i++) ids.push(add(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n, 1));
      ids.push(to);
      for (let i = 0; i < n; i++) links.push([ids[i], ids[i + 1], rest]);
      return { ids, rest };
    };

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, root.clientWidth);
      H = Math.max(1, root.clientHeight);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);

      pts = [];
      links = [];
      const cx = W / 2;
      const spread = Math.min(W * 0.22, cw * 0.6);
      const top = -sw * 2;
      const bY = Math.max(40, Math.min(H * 0.22, H - (lowLen + ringR * 2 + clipH + ch) - 24));

      const aL = add(cx - spread, top, 0);
      iB = add(cx, bY, 1.4);
      const l = strand(aL, iB, N, 1.03);
      const aR = add(cx + spread, top, 0);
      const r = strand(aR, iB, N, 1.03);
      iT = add(cx, bY + lowLen, 0.8);
      const lo = strand(iB, iT, 3, 1);
      iC = add(cx, bY + lowLen + arm, 0.25);
      links.push([iT, iC, arm]);
      left = l.ids;
      right = r.ids;
      low = lo.ids;
      strandRest = l.rest;

      const c = look.current;
      const opts = { color: c.strapColor, ink: c.inkColor, text: c.strapText, label: c.strapLabel };
      strapTex = makeStrap(strandRest * N + 4, sw, dpr, opts);
      plainTex = makeStrap(lowLen + 4, sw * 0.85, dpr, { ...opts, plain: true });

      // Initial gentle swing entrance
      pts[iC].x += cw * 0.25;
      pts[iC].px = pts[iC].x - 1.5;
      spin.v = 2.5;
    };

    const STEP = 1 / 120;
    const GRAVITY = 2400;
    const ITER = 16;

    const ribbon = (ids, tex, rest, light) => {
      const Wt = tex.width;
      for (let i = 0; i < ids.length - 1; i++) {
        const a = pts[ids[i]];
        const b = pts[ids[i + 1]];
        const dx = (b.x - a.x) * dpr;
        const dy = (b.y - a.y) * dpr;
        const len = Math.hypot(dx, dy) || 1e-6;
        const tx = dx / len;
        const ty = dy / len;
        const nx = ty;
        const ny = -tx;
        const v0 = i * rest * dpr;
        const dv = rest * dpr;
        const k = len / dv;
        ctx.setTransform(nx, ny, tx * k, ty * k, a.x * dpr - (nx * Wt) / 2 - tx * k * v0, a.y * dpr - (ny * Wt) / 2 - ty * k * v0);
        const src = Math.min(dv + 1.5, tex.height - v0);
        if (src > 0) ctx.drawImage(tex, 0, v0, Wt, src, 0, v0, Wt, src);
        const shade = 0.22 * (1 - Math.max(0, nx * light));
        ctx.fillStyle = 'rgba(0,0,0,' + shade.toFixed(3) + ')';
        ctx.fillRect(0, v0, Wt, dv + 1);
      }
    };

    const metal = (x0, y0, x1, y1) => {
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, '#f8fafc');
      g.addColorStop(0.45, '#cbd5e1');
      g.addColorStop(0.55, '#94a3b8');
      g.addColorStop(1, '#e2e8f0');
      return g;
    };

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!strapTex || !plainTex) return;
      ctx.imageSmoothingEnabled = true;
      ribbon(left, strapTex, strandRest, -1);
      ribbon(right, strapTex, strandRest, 1);
      ribbon(low, plainTex, (lowLen * 1) / 3, 0);

      // Side-release buckle
      const B = pts[iB];
      const T = pts[iT];
      const ang = Math.atan2(T.x - B.x, T.y - B.y);
      const u = sw / 20;
      ctx.setTransform(dpr, 0, 0, dpr, B.x * dpr, B.y * dpr);
      ctx.rotate(-ang);
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 5 * dpr;
      ctx.shadowOffsetY = 2 * dpr;
      ctx.fillStyle = metal(-16 * u, 0, 16 * u, 0);
      ctx.beginPath();
      ctx.roundRect(-15 * u, -14 * u, 30 * u, 17 * u, 3 * u);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(-11 * u, 1 * u, 22 * u, 15 * u, [2 * u, 2 * u, 6 * u, 6 * u]);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = 'rgba(30,41,59,0.7)';
      ctx.fillRect(-10 * u, -9 * u, 20 * u, 2.2 * u);
      ctx.fillRect(-5 * u, 6 * u, 10 * u, 3 * u);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 0.8 * u;
      ctx.beginPath();
      ctx.moveTo(-13 * u, -12.5 * u);
      ctx.lineTo(13 * u, -12.5 * u);
      ctx.stroke();

      // Split ring
      ctx.setTransform(dpr, 0, 0, dpr, T.x * dpr, (T.y + ringR * 0.8) * dpr);
      ctx.lineWidth = Math.max(2.5, ringR * 0.38);
      ctx.strokeStyle = metal(-ringR, -ringR, ringR, ringR);
      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, Math.PI * 2);
      ctx.stroke();
    };

    const place = () => {
      const T = pts[iT];
      const C = pts[iC];
      const swing = swingAngle(T, C);
      card.style.transform =
        'translate3d(' + (T.x - cw / 2).toFixed(2) + 'px,' + (T.y + ringR).toFixed(2) + 'px,0) rotate(' + (-swing).toFixed(4) + 'rad)';
      inner.style.transform = 'perspective(1100px) rotateY(' + spin.a.toFixed(4) + 'rad)';
    };

    // Pointer Interaction (Drag & Flip)
    let drag = null;
    const local = (e) => {
      const r = root.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };

    const flip = () => {
      spinTarget = spinTarget === 0 ? Math.PI : 0;
      const nextShowBack = spinTarget !== 0;
      setShowBack(nextShowBack);
      onFlipChange?.(nextShowBack);
    };
    flipRef.current = flip;

    const onDown = (e) => {
      if (e.button > 0) return;
      const [x, y] = local(e);
      const T = pts[iT];
      drag = { id: e.pointerId, ox: T.x - x, oy: T.y - y, tx: T.x, ty: T.y, sx: x, sy: y, moved: false };
      pts[iT].w = 0;
      card.setPointerCapture(e.pointerId);
      card.style.cursor = 'grabbing';
    };

    const onMove = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const [x, y] = local(e);
      drag.tx = x + drag.ox;
      drag.ty = y + drag.oy;
      if (Math.hypot(x - drag.sx, y - drag.sy) > 6) drag.moved = true;
    };

    const onUp = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.moved) flip();
      drag = null;
      pts[iT].w = 0.8;
      card.style.cursor = 'grab';
    };

    card.addEventListener('pointerdown', onDown);
    card.addEventListener('pointermove', onMove);
    card.addEventListener('pointerup', onUp);
    card.addEventListener('pointercancel', onUp);

    // Physics Loop
    let raf = 0;
    let acc = 0;
    let last = performance.now();
    let t = 0;

    const tick = (now) => {
      acc += Math.min(0.05, (now - last) / 1000);
      last = now;
      let steps = 0;
      while (acc >= STEP && steps < 8) {
        acc -= STEP;
        steps++;
        t += STEP;
        if (drag) {
          const T = pts[iT];
          T.px = T.x;
          T.py = T.y;
          T.x += (drag.tx - T.x) * 0.35;
          T.y += (drag.ty - T.y) * 0.35;
        }
        const C = pts[iC];
        if (!drag) {
          // Subtle room draught oscillation so badge feels alive
          C.x += (18 * Math.sin(t * 0.7) + 8 * Math.sin(t * 1.8)) * STEP * STEP;
        }
        integrate(pts, STEP, GRAVITY, 0.992);
        solve(pts, links, ITER);
        const vx = (C.x - C.px) / STEP;
        spinStep(spin, spinTarget, STEP, vx * 0.03 + 0.5 * Math.sin(t * 0.5));
      }
      draw();
      place();
      raf = requestAnimationFrame(tick);
    };

    build();
    draw();
    place();
    raf = requestAnimationFrame(tick);

    const observer = new ResizeObserver(() => {
      if (Math.abs(root.clientWidth - W) < 1 && Math.abs(root.clientHeight - H) < 1) return;
      build();
      draw();
      place();
    });
    observer.observe(root);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      card.removeEventListener('pointerdown', onDown);
      card.removeEventListener('pointermove', onMove);
      card.removeEventListener('pointerup', onUp);
      card.removeEventListener('pointercancel', onUp);
    };
  }, [cw, ch, ringR, clipH, lookKey]);

  const faceStyle = {
    position: 'absolute',
    inset: 0,
    borderRadius: cw * 0.06,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    boxShadow: '0 16px 36px -10px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.15)',
  };

  const slot = (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: cw * 0.045,
        left: '50%',
        width: cw * 0.22,
        height: cw * 0.036,
        transform: 'translateX(-50%)',
        borderRadius: 999,
        background: 'rgba(0,0,0,0.32)',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)',
        zIndex: 5,
      }}
    />
  );

  return (
    <div
      ref={rootRef}
      className={`relative w-full overflow-hidden select-none ${className}`}
      style={{ height }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          maxWidth: 'none',
          display: 'block',
          pointerEvents: 'none',
        }}
      />
      <div
        ref={cardRef}
        role="button"
        tabIndex={0}
        aria-label="Student ID Badge. Drag to swing, tap to flip."
        className="absolute left-0 top-0 outline-none"
        style={{
          width: cw,
          height: ch + ringR + clipH,
          transformOrigin: '50% 0',
          cursor: 'grab',
          touchAction: 'none',
          willChange: 'transform',
        }}
      >
        {/* Badge metal clip */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            width: cw * 0.075,
            height: clipH + cw * 0.05,
            transform: 'translateX(-50%)',
            borderRadius: cw * 0.02,
            background: 'linear-gradient(90deg, #f8fafc, #94a3b8 50%, #e2e8f0)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            zIndex: 10,
          }}
        />

        {/* 3D Rotating Inner Card */}
        <div
          ref={innerRef}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: ringR + clipH * 0.6,
            height: ch,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Front Face */}
          <div style={faceStyle}>
            {front}
            {slot}
          </div>

          {/* Back Face */}
          <div style={{ ...faceStyle, transform: 'rotateY(180deg)' }}>
            {back}
            {slot}
          </div>
        </div>
      </div>
    </div>
  );
});

export default LanyardBadge;
