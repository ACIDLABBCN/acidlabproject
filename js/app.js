/* ACID LAB · PORTADA · app.js
   Orquesta la portada coming soon: intro del logo (CSS), derretido con el
   scroll, las muestras que se mueven y suenan, el secuenciador y los idiomas.
   El fondo es del body (no del bloque fijo) para que las muestras, que van por
   detrás del contenido, se vean siempre: gris LAB arriba y, con el derretido,
   verde ácido; desde la mitad del derretido todo pasa a azul (body.tono-verde).
   El secuenciador va en la portada, a la derecha del logo, en escritorio; en
   celular se muda a la pantalla verde de abajo. */

import { iniciarDerretido } from './derretir.js';
import { crearSonido } from './sonido.js';
import { iniciarSecuenciador } from './secuenciador.js';
import { iniciarFlotantes } from './flotantes.js';
import { FIGURAS } from './figuras.js';
import { crearIdioma } from './textos.js';
import { iniciarRotulo } from './rotulo.js';

const html = document.documentElement;
const body = document.body;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const idioma = crearIdioma();
idioma.aplicar();

/* ---------- derretido del logo y color de fondo ---------- */
const seccion = document.getElementById('hero');
const pin = document.getElementById('portada-pin');
let derretido = null;
try {
  derretido = iniciarDerretido({
    seccion, pin, svg: document.querySelector('.logo'), reduced, fondo: false, escuchar: false,
    fundidos: [...pin.querySelectorAll('.pista, .bajar')]
  });
} catch (err) { console.error('[acidlab] derretido:', err); }

const GRIS = [0xb3, 0xb3, 0xb3], VERDE = [0xa7, 0xff, 0x00];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = u => u * u * (3 - 2 * u);
let listo = false, fondoPrev = '';
function fondo() {
  const r = seccion.getBoundingClientRect(), vh = window.innerHeight || 800;
  // progreso del bloque fijo (igual que el derretido); con movimiento reducido, el corte al pasar la portada
  const p = reduced ? (r.bottom < vh * 0.5 ? 1 : 0) : (listo ? clamp(-r.top / Math.max(1, r.height - vh), 0, 1) : 0);
  const u = smooth(clamp((p - 0.45) / 0.5, 0, 1));
  const c = 'rgb(' + GRIS.map((g, i) => Math.round(g + (VERDE[i] - g) * u)).join(', ') + ')';
  if (c !== fondoPrev) {
    fondoPrev = c;
    body.style.backgroundColor = c;
    body.style.setProperty('--fondo', c);
  }
  body.classList.toggle('tono-verde', u > 0.5);
}
// un solo manejador por cuadro: primero se lee y pinta el fondo, después se deforma el logo
let pendiente = false;
function alMover(forzar) {
  if (pendiente) return;
  pendiente = true;
  requestAnimationFrame(() => {
    pendiente = false;
    fondo();
    if (derretido) { if (forzar === true) derretido.activar(); else derretido.leer(); }
  });
}
window.addEventListener('scroll', alMover, { passive: true });
window.addEventListener('resize', () => alMover(listo), { passive: true });
fondo();

/* ---------- intro: cuando el punto de LAB. termina, el resto aparece ---------- */
function marcarListo() {
  if (listo) return;
  listo = true;
  body.classList.add('listo');
  if (derretido) derretido.activar();
  fondo();
}
if (html.classList.contains('intro')) {
  const punto = document.querySelector('.logo .punto');
  if (punto) punto.addEventListener('animationend', marcarListo, { once: true });
  setTimeout(marcarListo, 3800);
} else setTimeout(marcarListo, 60);

/* ---------- sonido ---------- */
const sonido = crearSonido();
const btnSonido = document.getElementById('btn-sonido');
function rotularSonido() { btnSonido.textContent = idioma.t(sonido.mudo ? 'sonido.no' : 'sonido.si'); }
btnSonido.addEventListener('click', () => {
  sonido.asegurar();
  sonido.silenciar(!sonido.mudo);
  btnSonido.setAttribute('aria-pressed', String(!sonido.mudo));
  rotularSonido();
});
rotularSonido();

/* ---------- secuenciador: en la portada (escritorio) o abajo (celular) ---------- */
const seq = document.getElementById('seq');
const ancho = window.matchMedia('(min-width: 760px)');
function ubicarSeq() { document.getElementById(ancho.matches ? 'seq-arriba' : 'seq-abajo').appendChild(seq); }
ubicarSeq();
ancho.addEventListener('change', ubicarSeq);
// arranca con el beat fijo cargado y en play. El navegador no deja sonar nada antes del primer
// toque: el secuenciador queda esperando y ese primer toque (en cualquier parte) lo hace sonar
sonido.fijo();
sonido.play();
const secuenciador = iniciarSecuenciador({ raiz: seq, sonido, figuras: FIGURAS, t: idioma.t });
secuenciador.pintar();
// primer gesto real: desbloquea el audio (en iPhone el toque sobre una muestra no basta)
['touchend', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, () => sonido.desbloquear(), { passive: true }));

// "acid" del logo: lo mismo que el botón acid
const acid = document.querySelector('.logo .acid');
acid.addEventListener('click', () => secuenciador.azar());
acid.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); secuenciador.azar(); } });

/* ---------- muestras que se mueven y suenan ---------- */
const flotantes = iniciarFlotantes({
  capa: document.getElementById('flota'), reduced,
  nombre: f => idioma.t(f),
  alTocar: f => sonido.tocar(f)
});
sonido.alPaso((paso, suenan) => suenan.forEach(f => flotantes.saltar(f)));

/* ---------- titular que rota y se derrite ---------- */
const rotulo = iniciarRotulo({
  el: document.querySelector('.pronto-rot .frase'),
  filtro: document.getElementById('gotea'),
  frases: () => [idioma.t('rot.1'), idioma.t('rot.2')],
  reduced
});

idioma.alCambiar(t => { secuenciador.rotular(t); flotantes.renombrar(); rotularSonido(); rotulo.renombrar(); });
