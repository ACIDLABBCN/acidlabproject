/* ACID LAB · PORTADA · flotantes.js
   Las muestras se mueven por la pantalla, cada una a su manera:
   - pez: nada en curvas suaves hacia metas que cambian, y se da vuelta al girar
   - limón: rebota por los bordes como bola de billar, girando
   - ají: cae con gravedad, rebota abajo cada vez menos y vuelve a caer desde arriba
   - cebolla: rueda por el borde de abajo, el giro calzado con lo que avanza
   - cóctel: se desliza de lado a lado como lanzado por una barra, frena y se tambalea
   - ostra: quieta en un punto, se abre y se cierra lento
   - matraz: sube lento como burbuja, meciéndose, y reaparece abajo
   - tubo de ensayo: cuelga de arriba y oscila como péndulo
   - cerveza: gira sobre sí misma como en el juego de la botella, frena y vuelve a girar
   Van detrás del logo, el texto y el secuenciador (pasan por atrás, no lo
   tapan). Cada una es un botón: al tocarla salta y avisa (alTocar) para que
   suene. saltar(nombre) las hace saltar sin sonido (el secuenciador, a tiempo).
   Movimiento reducido: quedan quietas en su lugar y se pueden tocar igual. */

import { FIGURAS } from './figuras.js';

const ESCRITORIO = ['pez', 'limon', 'aji', 'cebolla', 'coctel', 'ostra', 'matraz', 'tubo', 'cerveza'];
const CELULAR = ['pez', 'limon', 'aji', 'coctel', 'ostra', 'matraz', 'cerveza'];
const rr = (a, b) => a + (b - a) * Math.random();

export function iniciarFlotantes({ capa, reduced = false, alTocar = () => {}, nombre = n => n }) {
  const tipos = window.innerWidth < 760 ? CELULAR : ESCRITORIO;
  let W = window.innerWidth, H = window.innerHeight, S = tamano();

  const items = tipos.map(tipo => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'flot';
    el.dataset.f = tipo;
    el.innerHTML = FIGURAS[tipo];
    el.setAttribute('aria-label', nombre(tipo));
    capa.appendChild(el);
    const it = { el, tipo, x: 0, y: 0, vx: 0, vy: 0, rot: 0, esc: 1, voltear: 1, t: rr(0, 10), golpe: 0, e: {} };
    el.addEventListener('pointerdown', e => { e.preventDefault(); tocar(it); });
    el.addEventListener('click', e => { if (e.detail === 0) tocar(it); });   // teclado
    return it;
  });

  function tamano() { return window.innerWidth < 760 ? 56 : 82; }
  function tocar(it) {
    alTocar(it.tipo);
    saltarItem(it, true);
    it.golpe = 1;
    if (reduced) return;
    // un empujón propio de cada uno
    if (it.tipo === 'limon') { it.vx *= 1.8; it.vy *= 1.8; }
    else if (it.tipo === 'aji') it.vy = -Math.abs(it.vy) - 500;
    else if (it.tipo === 'pez') it.e.prisa = 1;
    else if (it.tipo === 'coctel') it.vx = (Math.random() < 0.5 ? -1 : 1) * 700;
    else if (it.tipo === 'cebolla') it.vx *= -1.6;
    else if (it.tipo === 'tubo') it.e.amp = Math.min(0.9, it.e.amp + 0.35);
    else if (it.tipo === 'cerveza') it.e.giro = Math.max(it.e.giro, 900);
  }
  function saltarItem(it, fuerte = false) {
    const svg = it.el.firstElementChild;
    if (!svg || !svg.animate) return;
    svg.animate(
      [{ transform: 'scale(1)' }, { transform: `scale(${fuerte ? 1.3 : 1.16})` }, { transform: 'scale(1)' }],
      { duration: fuerte ? 280 : 190, easing: 'cubic-bezier(.3, 1.6, .5, 1)' }
    );
  }
  function saltar(tipo) { items.forEach(it => { if (it.tipo === tipo) saltarItem(it); }); }

  /* ---------- estado inicial por tipo ---------- */
  function iniciar(it, k) {
    const h = S / 2, e = it.e;
    it.x = rr(h, W - h); it.y = rr(H * 0.2, H * 0.8);
    switch (it.tipo) {
      case 'pez': e.meta = [rr(0.1, 0.9) * W, rr(0.2, 0.8) * H]; e.prisa = 0; break;
      case 'limon': { const a = rr(0, Math.PI * 2); it.vx = Math.cos(a) * 110; it.vy = Math.sin(a) * 110; e.vr = rr(40, 90); break; }
      case 'aji': it.y = rr(-H * 0.6, 0); it.vx = rr(-40, 40); it.vy = 0; break;
      case 'cebolla': it.y = H - h - 70; it.vx = rr(50, 80) * (Math.random() < 0.5 ? -1 : 1); break;
      case 'coctel': e.barra = H * 0.72; it.y = e.barra; it.vx = 0; e.espera = rr(0.5, 2); e.quieto = 0; break;
      case 'ostra': e.casa = [rr(0.62, 0.92) * W, rr(0.25, 0.45) * H]; it.x = e.casa[0]; it.y = e.casa[1]; break;
      case 'matraz': it.vy = -rr(22, 36); break;
      case 'tubo': e.pivote = rr(0.15, 0.85) * W; e.largo = Math.min(H * 0.32, 260); e.amp = 0.45; break;
      case 'cerveza': it.x = rr(0.15, 0.85) * W; it.y = rr(0.3, 0.75) * H; it.vx = rr(-14, 14); it.vy = rr(-10, 10); e.giro = rr(300, 700); e.pausa = 0; break;
    }
    if (reduced) {
      // quietos, repartidos en una grilla suelta que no cae sobre el centro
      const cols = Math.ceil(items.length / 2), fila = k % 2, col = Math.floor(k / 2);
      it.x = ((col + 0.5) / cols) * W; it.y = fila ? H - S * 1.4 : S * 1.6;
      it.rot = rr(-12, 12);
    }
  }

  /* ---------- movimiento ---------- */
  function mover(it, dt) {
    const h = S / 2, e = it.e;
    it.t += dt;
    switch (it.tipo) {
      case 'pez': {
        const dx = e.meta[0] - it.x, dy = e.meta[1] - it.y;
        if (dx * dx + dy * dy < 900) e.meta = [rr(0.08, 0.92) * W, rr(0.18, 0.85) * H];
        const vel = 70 + e.prisa * 260, ang = Math.atan2(dy, dx);
        it.vx += (Math.cos(ang) * vel - it.vx) * Math.min(1, dt * 1.1);
        it.vy += (Math.sin(ang) * vel * 0.7 - it.vy) * Math.min(1, dt * 1.1);
        it.x += it.vx * dt; it.y += it.vy * dt;
        e.prisa = Math.max(0, e.prisa - dt * 0.7);
        it.voltear = it.vx < 0 ? -1 : 1;
        // coletazo: un vaivén corto, más rápido con prisa
        it.rot = Math.atan2(it.vy, Math.abs(it.vx)) * 25 * it.voltear + Math.sin(it.t * (6 + e.prisa * 10)) * 6;
        break;
      }
      case 'limon':
        it.x += it.vx * dt; it.y += it.vy * dt; it.rot += e.vr * dt * (1 + it.golpe * 4);
        if (it.x < h) { it.x = h; it.vx = Math.abs(it.vx); } if (it.x > W - h) { it.x = W - h; it.vx = -Math.abs(it.vx); }
        if (it.y < h) { it.y = h; it.vy = Math.abs(it.vy); } if (it.y > H - h) { it.y = H - h; it.vy = -Math.abs(it.vy); }
        { const v = Math.hypot(it.vx, it.vy); if (v > 120) { it.vx *= 1 - dt * 0.8; it.vy *= 1 - dt * 0.8; } }
        break;
      case 'aji':
        it.vy += 1100 * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.rot += it.vx * dt * 0.8;
        if (it.x < h || it.x > W - h) { it.vx *= -1; it.x = Math.max(h, Math.min(W - h, it.x)); }
        if (it.y > H - h) {
          it.y = H - h; it.vy = -Math.abs(it.vy) * 0.62;
          if (Math.abs(it.vy) < 140) { it.y = -S; it.x = rr(h, W - h); it.vy = rr(0, 80); it.vx = rr(-50, 50); }
        }
        break;
      case 'cebolla':
        it.x += it.vx * dt; it.y = H - h - 70;
        it.rot += (it.vx * dt / h) * (180 / Math.PI);
        if (it.x < h) { it.x = h; it.vx = Math.abs(it.vx); } if (it.x > W - h) { it.x = W - h; it.vx = -Math.abs(it.vx); }
        if (Math.abs(it.vx) > 80) it.vx *= 1 - dt * 0.9;
        break;
      case 'coctel':
        it.y = e.barra;
        if (Math.abs(it.vx) > 12) {
          // deslizándose por la barra: frena de a poco, inclinado hacia donde va
          e.quieto = 0;
          it.x += it.vx * dt; it.vx *= 1 - Math.min(0.9, dt * 1.6);
          it.rot = -Math.sign(it.vx) * 4;
          if (it.x < h) { it.x = h; it.vx = Math.abs(it.vx) * 0.4; } if (it.x > W - h) { it.x = W - h; it.vx = -Math.abs(it.vx) * 0.4; }
        } else {
          // frenó: se tambalea y espera el próximo lanzamiento
          it.vx = 0; e.quieto += dt;
          it.rot = Math.sin(e.quieto * 14) * 10 * Math.max(0, 1 - e.quieto * 1.4);
          if (e.quieto > e.espera) { it.vx = (it.x > W / 2 ? -1 : 1) * rr(420, 620); e.espera = rr(1.2, 3); }
        }
        break;
      case 'ostra':
        it.x = e.casa[0]; it.y = e.casa[1] + Math.sin(it.t * 0.8) * 4;
        it.esc = 1 + Math.sin(it.t * 1.6) * 0.05 + it.golpe * 0.25;
        break;
      case 'matraz':
        it.y += it.vy * dt; it.x += Math.sin(it.t * 1.3) * 18 * dt; it.rot = Math.sin(it.t * 1.3) * 8;
        if (it.golpe > 0) it.rot += Math.sin(it.t * 40) * 6 * it.golpe;
        if (it.y < -S) { it.y = H + S; it.x = rr(h, W - h); }
        break;
      case 'tubo': {
        const a = Math.sin(it.t * 1.7) * e.amp;
        it.x = e.pivote + Math.sin(a) * e.largo; it.y = -S * 0.1 + Math.cos(a) * e.largo;
        it.rot = -a * (180 / Math.PI);
        e.amp += (0.45 - e.amp) * dt * 0.4;
        break;
      }
      case 'cerveza':
        // gira, frena de a poco, se queda apuntando un rato y vuelve a girar
        it.x += it.vx * dt; it.y += it.vy * dt;
        if (it.x < h || it.x > W - h) it.vx *= -1;
        if (it.y < h || it.y > H - h) it.vy *= -1;
        if (e.giro > 8) { it.rot += e.giro * dt; e.giro *= 1 - Math.min(0.9, dt * 0.7); }
        else { e.pausa += dt; if (e.pausa > 1.6) { e.pausa = 0; e.giro = rr(400, 800); } }
        break;
    }
    it.golpe = Math.max(0, it.golpe - dt * 3);
  }
  function pintar(it) {
    it.el.style.transform = `translate(${(it.x - S / 2).toFixed(1)}px, ${(it.y - S / 2).toFixed(1)}px) rotate(${it.rot.toFixed(1)}deg) scale(${(it.esc * it.voltear).toFixed(3)}, ${it.esc.toFixed(3)})`;
  }

  function medir() {
    W = window.innerWidth; H = window.innerHeight; S = tamano();
    items.forEach(it => { it.el.style.width = it.el.style.height = S + 'px'; });
  }
  medir();
  items.forEach((it, k) => { iniciar(it, k); pintar(it); });

  let raf = 0, last = 0;
  function frame(ms) {
    raf = requestAnimationFrame(frame);
    const now = ms / 1000, dt = Math.min(0.05, Math.max(0, now - last));
    last = now;
    for (const it of items) { mover(it, dt); pintar(it); }
  }
  function start() { if (raf || reduced || document.hidden) return; last = performance.now() / 1000; raf = requestAnimationFrame(frame); }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); });
  let tr = 0;
  window.addEventListener('resize', () => {
    clearTimeout(tr);
    tr = setTimeout(() => { medir(); items.forEach((it, k) => { if (reduced || it.tipo === 'ostra' || it.tipo === 'tubo' || it.tipo === 'coctel' || it.tipo === 'cebolla') iniciar(it, k); pintar(it); }); }, 150);
  }, { passive: true });
  start();

  return { saltar, renombrar() { items.forEach(it => it.el.setAttribute('aria-label', nombre(it.tipo))); } };
}
