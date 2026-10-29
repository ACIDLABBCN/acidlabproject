/* ACID LAB · PORTADA · textos.js
   Español y catalán. El HTML trae el español de respaldo; [data-i18n] toma el
   texto de aquí y [data-i18n-aria] la etiqueta accesible. El catalán está
   pendiente de revisión por un hablante nativo. */

export const IDIOMAS = ['es', 'ca'];
const CLAVE_LS = 'acidlab-idioma';

export const TEXTOS = {
  es: {
    'rot.1': 'abrimos pronto.', 'rot.2': 'mientras, juega con el secuenciador.', pronto: 'próximamente', que: 'CRUDOS Y CÓCTELES',
    pista: 'toca las muestras.', 'pista.espera': 'toca en cualquier parte para escuchar.', bajar: 'bajar',
    'seq.tit': 'el lab suena.', 'seq.sub': 'cada muestra es un sonido.', bpm: 'bpm', 'aria.bpm': 'tempo', 'bpm.menos': 'más lento', 'bpm.mas': 'más rápido',
    play: 'play', stop: 'stop', acid: 'acid', limpiar: 'borrar', 'seq.nota': 'toca acid para un beat al azar.',
    'sonido.si': 'sonido sí', 'sonido.no': 'sonido no',
    abrimos: 'abrimos pronto en sant antoni, barcelona.', 'cta.sub': 'síguenos en instagram para saber cuándo abrimos.',
    pie: 'acid LAB. · CRUDOS Y CÓCTELES · sant antoni, barcelona',
    'aria.acid': 'acid: armar un beat al azar', 'aria.idioma': 'Idioma', 'aria.seq': 'secuenciador', 'aria.mitad': 'parte del loop',
    paso: 'paso',
    pez: 'pez', limon: 'limón', cebolla: 'cebolla', coctel: 'cóctel', ostra: 'ostra', aji: 'ají',
    matraz: 'matraz', tubo: 'tubo de ensayo', cerveza: 'cerveza'
  },
  ca: {
    'rot.1': 'obrim aviat.', 'rot.2': 'mentrestant, juga amb el seqüenciador.', pronto: 'properament', que: 'CRUS I CÒCTELS',
    pista: 'toca les mostres.', 'pista.espera': 'toca a qualsevol lloc per escoltar.', bajar: 'baixa',
    'seq.tit': 'el lab sona.', 'seq.sub': 'cada mostra és un so.', bpm: 'bpm', 'aria.bpm': 'tempo', 'bpm.menos': 'més lent', 'bpm.mas': 'més ràpid',
    play: 'play', stop: 'stop', acid: 'acid', limpiar: 'esborra', 'seq.nota': 'toca acid per a un beat a l’atzar.',
    'sonido.si': 'so sí', 'sonido.no': 'so no',
    abrimos: 'obrim aviat a sant antoni, barcelona.', 'cta.sub': 'segueix-nos a instagram per saber quan obrim.',
    pie: 'acid LAB. · CRUS I CÒCTELS · sant antoni, barcelona',
    'aria.acid': 'acid: fer un beat a l’atzar', 'aria.idioma': 'Idioma', 'aria.seq': 'seqüenciador', 'aria.mitad': 'part del loop',
    paso: 'pas',
    pez: 'peix', limon: 'llimona', cebolla: 'ceba', coctel: 'còctel', ostra: 'ostra', aji: 'ají',
    matraz: 'matràs', tubo: 'tub d’assaig', cerveza: 'cervesa'
  }
};

export function crearIdioma() {
  const oyentes = [];
  let idioma = inicial();
  function inicial() {
    try { const g = localStorage.getItem(CLAVE_LS); if (IDIOMAS.includes(g)) return g; } catch (err) { /* sin storage */ }
    return String(navigator.language || '').toLowerCase().startsWith('ca') ? 'ca' : 'es';
  }
  const t = k => (TEXTOS[idioma] && TEXTOS[idioma][k]) || TEXTOS.es[k] || '';
  function aplicar() {
    document.documentElement.lang = idioma;
    document.querySelectorAll('[data-idioma]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.idioma === idioma)));
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
    oyentes.forEach(fn => fn(t));
  }
  document.querySelectorAll('[data-idioma]').forEach(b => b.addEventListener('click', () => {
    idioma = b.dataset.idioma;
    try { localStorage.setItem(CLAVE_LS, idioma); } catch (err) { /* sin storage */ }
    aplicar();
  }));
  return { t, aplicar, alCambiar(fn) { oyentes.push(fn); }, get idioma() { return idioma; } };
}
