/* ACID LAB · PORTADA · derretir.js (copia de sitio/js/derretir.js: aquí el fondo
   pasa del gris al color que se pida en "hasta"; en la portada, el verde ácido)
   El logo grande del hero se derrite como cera con el scroll. No toca la intro
   (las máscaras que escriben el "acid"): trabaja sobre los grupos .letra que
   envuelven cada letra, "LAB." y el punto, y sobre el atributo d de sus paths.

   En reposo (p = 0) el logo queda quieto e idéntico al de la intro: sin
   filtro, sin gotas, con el d original. Las gotas y los chorros empiezan
   recién con el scroll.
   - Derretido (por scroll, reversible): el bloque de la portada va fijo
     (sticky) durante dos pantallas. Con el progreso p (0 a 1) se deforman los
     puntos de control del path de cada letra: la parte alta se queda en su
     sitio, la masa se hunde cada vez más hacia abajo (sink = v^1.6 con v la
     altura relativa dentro de la letra), de forma desigual por columna (ruido
     en x), y se ensancha abajo como un charco; de 4 a 6 chorros por letra, de
     grosores y velocidades distintas, nacen en puntos de la base y se alargan
     hasta el borde inferior con una gota en la punta; al final todo escurre
     fuera de pantalla. Lo que se pase en "fundidos" se funde antes de que la
     masa llegue y, si fondo es true, el bloque pasa del gris LAB al color de
     "hasta". Al subir, todo se recompone.

   Móvil: menos chorros, desenfoque menor y un solo filtro goo para todo el
   logo (en vez de uno por letra). prefers-reduced-motion: el logo queda quieto,
   sin filtro, sin deformación y sin fundido. */

const SVGNS = 'http://www.w3.org/2000/svg';
const ANCHO_VB = 571.59;   // ancho del viewBox del logo
const GRIS = [0xb3, 0xb3, 0xb3], CELESTE = [0x8c, 0xc5, 0xff];

/* letras del logo: selector del grupo, orden de derretido y puntos de la base
   de donde nacen los chorros (coordenadas del viewBox); w = grosor, v = velocidad */
const LETRAS = [
  { id: 'a', sel: '.letra-a', orden: 0, semilla: 1.3,
    gotas: [[22, 262, 24, 1.0], [58, 262, 18, 1.3], [100, 254, 28, 0.8], [136, 296, 16, 1.2], [156, 310, 22, 1.1]] },
  { id: 'c', sel: '.letra-c', orden: 1, semilla: 2.1,
    gotas: [[214, 286, 18, 1.2], [240, 299, 26, 0.9], [264, 299, 20, 1.3], [291, 287, 16, 1.0]] },
  { id: 'i', sel: '.letra-i', orden: 2, semilla: 3.7,
    gotas: [[364, 274, 20, 1.0], [384, 273, 16, 1.3]] },
  { id: 'ip', sel: '.letra-ip', orden: 2, semilla: 4.2, gotas: [] },
  { id: 'd', sel: '.letra-d', orden: 3, semilla: 5.9,
    gotas: [[458, 246, 18, 1.2], [480, 270, 26, 0.9], [504, 285, 22, 1.1], [527, 270, 16, 1.3]] },
  { id: 'lab', sel: '.letra-lab', orden: 4, semilla: 7.4,
    gotas: [[335, 397, 20, 1.0], [362, 397, 16, 1.3], [400, 397, 24, 0.9], [458, 397, 18, 1.2], [486, 397, 26, 0.8], [525, 397, 16, 1.1]] },
  { id: 'punto', sel: '.letra-punto', orden: 5, semilla: 8.8,
    gotas: [[561, 397, 14, 1.1], [568, 397, 12, 0.9]] }
];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const tramo = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const smooth = u => u * u * (3 - 2 * u);
const mezcla = (a, b, u) => 'rgb(' + a.map((c, i) => Math.round(c + (b[i] - c) * u)).join(', ') + ')';

// path absoluto con M, L, C y Z (los del logo): lista de segmentos con sus pares x,y
function parsearPath(d) {
  const tokens = d.match(/[MLCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) || [];
  const segs = [];
  let seg = null;
  for (const tk of tokens) {
    if (/^[MLCZ]$/i.test(tk)) { seg = { cmd: tk.toUpperCase(), nums: [] }; segs.push(seg); }
    else if (seg) seg.nums.push(parseFloat(tk));
  }
  return segs;
}
function cajaDe(segs) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of segs) for (let i = 0; i < s.nums.length; i += 2) {
    x0 = Math.min(x0, s.nums[i]); x1 = Math.max(x1, s.nums[i]);
    y0 = Math.min(y0, s.nums[i + 1]); y1 = Math.max(y1, s.nums[i + 1]);
  }
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

export function iniciarDerretido({ seccion, pin, svg, fundidos = [], reduced = false, fondo = true, hasta = CELESTE, escuchar = true }) {
  const doc = svg.ownerDocument || document;
  const angosto = window.innerWidth < 760;
  const defs = svg.querySelector('defs');
  const letras = [];
  const el = (tag, attrs) => {
    const e = doc.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  };
  // móvil: todas las letras dentro de un grupo con un único filtro goo
  let todo = null;
  if (angosto && !reduced && defs) {
    const f = el('filter', { id: 'goo-todo', filterUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB', x: -90, y: -40, width: ANCHO_VB + 180, height: 1400 });
    f.appendChild(el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: 3.5, result: 'b' }));
    f.appendChild(el('feColorMatrix', { in: 'b', mode: 'matrix', values: '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7' }));
    defs.appendChild(f);
    todo = el('g', { class: 'goo-todo' });
    const primera = svg.querySelector('.acid');
    if (primera) {
      primera.parentNode.insertBefore(todo, primera);
      ['.acid', '.letra-lab', '.letra-punto'].forEach(sel => { const g = svg.querySelector(sel); if (g) todo.appendChild(g); });
    } else todo = null;
  }

  LETRAS.forEach((cfg, n) => {
    const g = svg.querySelector(cfg.sel);
    if (!g) return;
    const paths = [...g.querySelectorAll('path')].map(p => {
      const orig = p.getAttribute('d') || '';
      return { el: p, orig, segs: parsearPath(orig) };
    });
    if (!paths.length) return;
    // caja de la letra (todos sus paths): de ahí salen la altura relativa y el centro
    const cajas = paths.map(p => cajaDe(p.segs));
    const caja = {
      x: Math.min(...cajas.map(c => c.x)), y: Math.min(...cajas.map(c => c.y)),
      x1: Math.max(...cajas.map(c => c.x + c.width)), y1: Math.max(...cajas.map(c => c.y + c.height))
    };
    caja.width = caja.x1 - caja.x; caja.height = caja.y1 - caja.y;
    const xc = caja.x + caja.width / 2;
    const chorros = [];
    const gotas = angosto ? cfg.gotas.filter((_, k) => k % 2 === 0) : cfg.gotas;
    let filtro = '';
    if (!reduced && gotas.length && defs) {
      if (todo) filtro = 'todo';
      else {
      // filtro goo propio por letra (se aplica solo mientras hay scroll), con región en unidades
      // de usuario que cubre el charco y el chorro hasta el borde inferior
      const f = el('filter', {
        id: `goo-${cfg.id}`, filterUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB',
        x: (caja.x - 90).toFixed(1), y: (caja.y - 40).toFixed(1), width: (caja.width + 180).toFixed(1), height: 1400
      });
      f.appendChild(el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: angosto ? 3.5 : 4.5, result: 'b' }));
      f.appendChild(el('feColorMatrix', { in: 'b', mode: 'matrix', values: '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7' }));
      defs.appendChild(f);
      filtro = `url(#goo-${cfg.id})`;
      }
      gotas.forEach(([x, y, w, vel], k) => {
        // en reposo están ocultos; con el scroll aparecen dentro de la letra, el cuello se alarga y la gota baja
        const alto = 14;
        const cuello = el('rect', { class: 'cuello', x: x - w / 2, y: y - alto - 2, width: w, height: alto, display: 'none' });
        cuello.style.transformOrigin = `${x}px ${y - alto - 2}px`;
        const gota = el('circle', { class: 'gota', cx: x, cy: y - 9, r: w * 0.62, display: 'none' });
        gota.style.transformOrigin = `${x}px ${y - 9}px`;
        g.appendChild(cuello); g.appendChild(gota);
        chorros.push({ cuello, gota, x, y, w, vel, retardo: 0.04 + ((k * 7 + n * 3) % 5) * 0.045, alto, visible: false });
      });
    }
    letras.push({ g, paths, chorros, caja, xc, filtro, orden: cfg.orden, semilla: cfg.semilla });
  });

  /* deformación de un punto (x, y) de la letra con progreso pi:
     la parte alta se queda, la masa se hunde más cuanto más abajo (sink), con
     variación por columna (ruido en x), se ensancha abajo (charco) y, al final,
     todo baja D unidades y sale de pantalla. */
  function deformar(L, x, y, pi, D) {
    const v = clamp((y - L.caja.y) / Math.max(1, L.caja.height), 0, 1);
    const sink = Math.pow(v, 1.6);
    const ruido = 0.6 + 0.4 * (0.5 * Math.sin(x * 0.045 + L.semilla) + 0.5 * Math.sin(x * 0.11 + L.semilla * 1.7));
    const base = pi * pi;   // la parte alta baja más lento que la masa, pero acompaña: no quedan puntas sueltas
    const dy = D * (base + (1 - base) * sink * ruido * pi);
    const dx = (x - L.xc) * 0.3 * sink * pi + 5 * pi * Math.sin(y * 0.05 + L.semilla);
    return [x + dx, y + dy];
  }
  function pathDeformado(L, p, pi, D) {
    const partes = [];
    for (const s of p.segs) {
      if (s.cmd === 'Z') { partes.push('Z'); continue; }
      const nums = [];
      for (let i = 0; i < s.nums.length; i += 2) {
        const [x, y] = deformar(L, s.nums[i], s.nums[i + 1], pi, D);
        nums.push(x.toFixed(2), y.toFixed(2));
      }
      partes.push(s.cmd + ' ' + nums.join(' '));
    }
    return partes.join(' ');
  }

  let activo = false, pPrev = -1;

  function aplicar(p) {
    if (reduced) return;   // menos movimiento: el logo queda tal cual, sin derretido ni fundido
    const vh = window.innerHeight || 800;
    const k = ((svg.getBoundingClientRect && svg.getBoundingClientRect().width) || 600) / ANCHO_VB;   // px por unidad del viewBox
    const D = vh / k + 500;   // recorrido (en unidades) que saca la masa por abajo
    letras.forEach(L => {
      const pi = clamp((p - 0.055 * L.orden) / 0.7, 0, 1);
      // en reposo: sin filtro (logo idéntico al de la intro); con scroll: goo
      if (L.filtro && L.filtro !== 'todo') {
        const f = pi > 0 ? L.filtro : '';
        if (f !== L.g.style.filter) L.g.style.filter = f;
      }
      L.paths.forEach(pa => {
        const d = pi > 0 ? pathDeformado(L, pa, pi, D) : pa.orig;
        if (d !== pa.ultimo) { pa.el.setAttribute('d', d); pa.ultimo = d; }
      });
      L.chorros.forEach(c => {
        const ver = pi > 0;
        if (ver !== c.visible) {
          c.visible = ver;
          c.cuello.setAttribute('display', ver ? 'inline' : 'none');
          c.gota.setAttribute('display', ver ? 'inline' : 'none');
        }
        if (!ver) { c.cuello.style.transform = ''; c.gota.style.transform = ''; return; }
        const [ax, ay] = deformar(L, c.x, c.y, pi, D);   // el chorro sigue a su punto de la base
        const dx = ax - c.x, dy = ay - c.y;
        const pc = tramo(pi, c.retardo, 1);
        const largo = pc * D * c.vel;
        c.cuello.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(1, ${(1 + largo / c.alto).toFixed(2)})`;
        c.gota.style.transform = `translate(${dx.toFixed(1)}px, ${(dy + largo).toFixed(1)}px) scale(${(1 + 0.3 * pc).toFixed(2)}, ${(1 + 0.6 * pc).toFixed(2)})`;
      });
    });
    if (todo) { const f = p > 0 ? 'url(#goo-todo)' : ''; if (f !== todo.style.filter) todo.style.filter = f; }
    // lo que quede del logo se desvanece antes de que el fondo termine de pasar a celeste
    svg.style.opacity = String(1 - smooth(tramo(p, 0.45, 0.58)));
    // "coming soon" y la señal de bajar se funden antes de que la masa llegue abajo
    const f = 1 - clamp(p / 0.22, 0, 1);
    fundidos.forEach(e => {
      e.style.opacity = String(f);
      e.style.visibility = f > 0 ? '' : 'hidden';
      e.style.transform = `translateY(${((1 - f) * 40).toFixed(1)}px)`;
    });
    if (fondo) pin.style.backgroundColor = mezcla(GRIS, hasta, smooth(tramo(p, 0.45, 0.95)));
    doc.body.classList.toggle('derritiendo', p > 0.02);
  }
  function progreso() {
    const r = seccion.getBoundingClientRect();
    const vh = window.innerHeight || 800;
    return clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
  }
  function leer() {
    if (!activo) return;   // durante la intro no se toca nada (ni el logo ni los fundidos)
    const p = progreso();
    if (p === pPrev) return;
    pPrev = p;
    aplicar(p);
  }
  // escuchar: false cuando quien lo usa ya agrupa el scroll en un cuadro y llama a leer()
  if (escuchar) {
    window.addEventListener('scroll', leer, { passive: true });
    window.addEventListener('resize', () => { pPrev = -1; leer(); }, { passive: true });
  }

  return {
    // cuando la intro terminó (body.listo): el derretido toma el scroll actual
    activar() { activo = true; pPrev = -1; leer(); },
    aplicar, leer, progreso,
    get letras() { return letras; }
  };
}
