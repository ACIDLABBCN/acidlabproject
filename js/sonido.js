/* ACID LAB · PORTADA · sonido.js
   Kit de techno minimal sintetizado con Web Audio, sin archivos. Cada
   ingrediente es un instrumento:
   - pez: bombo seco (seno que cae de ~160 Hz al grave, con click de ataque)
   - limón: hi-hat metálico corto (seis cuadradas inarmónicas filtradas arriba)
   - cebolla: caja de techno (golpe tonal, ruido y un clap encima)
   - cóctel: shaker (ruido agudo con ataque suave, como la coctelera)
   - ostra: rimshot corto (triángulo agudo más un click)
   - ají: bajo acid (sierra con filtro resonante que se abre y cierra)
   - matraz: burbuja (seno que sube de golpe, como algo que hierve)
   - tubo de ensayo: vidrio (dos senos inarmónicos agudos con cola larga)
   - cerveza: destape (pop que cae de tono y un burbujeo corto)
   Al tocarlos sueltos (var = true) cada golpe varía un poco: otra nota, otro
   largo, otro tono. En el secuenciador suenan parejos, salvo el ají, que
   guarda su nota por paso.
   El contexto de audio se crea con el primer toque (iPhone y Android lo exigen).
   Secuenciador: 16 pasos, 126 bpm de partida (ajustable de 100 a 140, en vivo),
   con un poco de swing, programado por adelantado con el reloj del audio.
   alPaso(paso, nombres) avisa cuando suena. */

export const BPM = 126, BPM_MIN = 100, BPM_MAX = 140;
// orden de las filas del secuenciador: del grave al agudo, el bajo al final
export const FILAS = ['pez', 'cebolla', 'limon', 'coctel', 'ostra', 'cerveza', 'tubo', 'matraz', 'aji'];
const SWING = 0.54;
// notas del bajo en semitonos sobre La 1 (55 Hz): menor con la segunda bemol, el color acid
export const ESCALA = [0, 0, 0, 12, 3, 7, 10, 1, -2, 5];

export function crearSonido() {
  let ctx = null, master = null, ruido = null, mudo = false;
  const patron = Object.fromEntries(FILAS.map(f => [f, Array(16).fill(null)]));
  let tocando = false, paso = 0, proximo = 0, timer = 0, bpm = BPM;
  const oyentes = [];
  const r = Math.random;
  const entre = (a, b) => a + (b - a) * r();

  function asegurar() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.12;
    master = ctx.createGain();
    master.gain.value = mudo ? 0 : 0.8;
    master.connect(comp).connect(ctx.destination);
    const n = ctx.sampleRate;
    ruido = ctx.createBuffer(1, n, n);
    const d = ruido.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = r() * 2 - 1;
    return ctx;
  }

  function saturador(k) {
    const ws = ctx.createWaveShaper(), c = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); }
    ws.curve = c;
    return ws;
  }
  function env(g, t, pico, ataque, fin) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(pico, t + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + fin);
  }
  function ruidoA(t, dur, filtros, g) {
    const s = ctx.createBufferSource();
    s.buffer = ruido;
    let nodo = s;
    for (const [tipo, f, q = 0.7] of filtros) {
      const b = ctx.createBiquadFilter();
      b.type = tipo; b.frequency.value = f; b.Q.value = q;
      nodo = nodo.connect(b);
    }
    nodo.connect(g);
    s.start(t, r() * 0.5); s.stop(t + dur + 0.02);
  }

  function bombo(t, v = false) {
    const o = ctx.createOscillator(), g = ctx.createGain(), sat = saturador(2.2);
    const grave = v ? entre(40, 56) : 46, cola = v ? entre(0.3, 0.55) : 0.42;
    o.type = 'sine';
    o.frequency.setValueAtTime(v ? entre(140, 190) : 160, t);
    o.frequency.exponentialRampToValueAtTime(grave, t + 0.09);
    env(g, t, 1.15, 0.003, cola);
    o.connect(sat).connect(g).connect(master);
    o.start(t); o.stop(t + cola + 0.03);
    const gc = ctx.createGain();
    env(gc, t, 0.22, 0.001, 0.012);
    gc.connect(master);
    ruidoA(t, 0.02, [['highpass', 3000]], gc);
  }

  function hat(t, v = false, vel = 1) {
    const g = ctx.createGain(), bp = ctx.createBiquadFilter(), hp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = v ? entre(8000, 12000) : 10000; bp.Q.value = 0.8;
    hp.type = 'highpass'; hp.frequency.value = 7000;
    const largo = v ? (r() < 0.25 ? entre(0.14, 0.24) : entre(0.03, 0.07)) : 0.045;
    env(g, t, 0.28 * vel, 0.001, largo);
    bp.connect(hp).connect(g).connect(master);
    const base = v ? entre(36, 46) : 40;
    for (const k of [2, 3, 4.16, 5.43, 6.79, 8.21]) {
      const o = ctx.createOscillator();
      o.type = 'square'; o.frequency.value = base * k;
      o.connect(bp); o.start(t); o.stop(t + largo + 0.01);
    }
  }

  function caja(t, v = false) {
    const g = ctx.createGain(), sat = saturador(1.8);
    g.gain.value = 1;
    sat.connect(g).connect(master);
    const f = v ? entre(1000, 1800) : 1300, cola = v ? entre(0.14, 0.28) : 0.2;
    // cuerpo: golpe tonal corto
    const o = ctx.createOscillator(), go = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(v ? entre(190, 240) : 210, t);
    o.frequency.exponentialRampToValueAtTime(150, t + 0.06);
    env(go, t, 0.45, 0.002, 0.12);
    o.connect(go).connect(sat);
    o.start(t); o.stop(t + 0.14);
    // ruido de la caja
    const gr = ctx.createGain();
    env(gr, t, 0.5, 0.001, cola);
    gr.connect(sat);
    ruidoA(t, cola, [['highpass', 1400], ['peaking', 4200, 1]], gr);
    // clap encima: tres golpes muy juntos
    [0, 0.011, 0.022].forEach((d, i) => {
      const gi = ctx.createGain();
      env(gi, t + d, 0.42, 0.001, i === 2 ? cola * 0.8 : 0.012);
      gi.connect(sat);
      ruidoA(t + d, i === 2 ? cola : 0.015, [['bandpass', f, 1.4], ['highpass', 500]], gi);
    });
  }

  function shaker(t, v = false, vel = 1) {
    const g = ctx.createGain();
    const largo = v ? entre(0.06, 0.16) : 0.08;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.16 * vel, t + largo * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + largo);
    g.connect(master);
    ruidoA(t, largo, [['highpass', v ? entre(4500, 7500) : 6000], ['peaking', 9000, 1]], g);
  }

  function rim(t, v = false) {
    const o = ctx.createOscillator(), g = ctx.createGain(), hp = ctx.createBiquadFilter();
    o.type = 'triangle';
    const f = v ? entre(420, 980) : 620;
    o.frequency.setValueAtTime(f * 1.6, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.01);
    hp.type = 'highpass'; hp.frequency.value = 300;
    env(g, t, 0.34, 0.001, v ? entre(0.03, 0.07) : 0.045);
    o.connect(hp).connect(g).connect(master);
    o.start(t); o.stop(t + 0.1);
    const gc = ctx.createGain();
    env(gc, t, 0.12, 0.001, 0.008);
    gc.connect(master);
    ruidoA(t, 0.01, [['bandpass', 3500, 2]], gc);
  }

  function bajo(t, nota = 0, acento = false, dur = 0.11) {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(), sat = saturador(3);
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(55 * Math.pow(2, nota / 12), t);
    f.type = 'lowpass'; f.Q.value = acento ? 18 : 12;
    f.frequency.setValueAtTime(acento ? 3200 : 1500, t);
    f.frequency.exponentialRampToValueAtTime(170, t + (acento ? 0.22 : 0.15));
    const pico = acento ? 0.21 : 0.15;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(pico, t + 0.004);
    g.gain.setValueAtTime(pico, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.4);
    o.connect(f).connect(sat).connect(g).connect(master);
    o.start(t); o.stop(t + dur * 1.5);
  }
  function burbuja(t, v = false) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    const f0 = v ? entre(180, 320) : 240;
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * (v ? entre(3, 5) : 4), t + 0.06);
    env(g, t, 0.26, 0.004, 0.09);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + 0.12);
  }
  function vidrio(t, v = false) {
    const f = v ? entre(1400, 2600) : 1900, cola = v ? entre(0.35, 0.8) : 0.5;
    for (const [k, a] of [[1, 0.12], [2.76, 0.05], [5.4, 0.02]]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f * k;
      env(g, t, a, 0.002, cola / k ** 0.3);
      o.connect(g).connect(master);
      o.start(t); o.stop(t + cola + 0.05);
    }
  }
  function destape(t, v = false) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    const f0 = v ? entre(500, 800) : 640;
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * 0.25, t + 0.035);
    env(g, t, 0.42, 0.001, 0.06);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + 0.08);
    const gp = ctx.createGain();
    env(gp, t, 0.25, 0.001, 0.02);
    gp.connect(master);
    ruidoA(t, 0.02, [['bandpass', 1600, 1.2]], gp);
    // burbujeo: ruido agudo que se apaga
    const gf = ctx.createGain();
    gf.gain.setValueAtTime(0.0001, t + 0.02);
    gf.gain.exponentialRampToValueAtTime(0.07, t + 0.05);
    gf.gain.exponentialRampToValueAtTime(0.0001, t + (v ? entre(0.18, 0.35) : 0.24));
    gf.connect(master);
    ruidoA(t + 0.02, 0.36, [['highpass', 6500]], gf);
  }
  const notaAzar = () => ({ nota: ESCALA[Math.floor(r() * ESCALA.length)], acento: r() < 0.35 });

  // toque suelto: suena ya y cada vez distinto
  function tocar(nombre) {
    if (!asegurar()) return;
    const t = ctx.currentTime + 0.005;
    if (nombre === 'pez') bombo(t, true);
    else if (nombre === 'limon') hat(t, true);
    else if (nombre === 'cebolla') caja(t, true);
    else if (nombre === 'coctel') shaker(t, true);
    else if (nombre === 'ostra') rim(t, true);
    else if (nombre === 'aji') { const n = notaAzar(); bajo(t, n.nota, n.acento, entre(0.12, 0.3)); }
    else if (nombre === 'matraz') burbuja(t, true);
    else if (nombre === 'tubo') vidrio(t, true);
    else if (nombre === 'cerveza') destape(t, true);
  }

  /* ---------- secuenciador ---------- */
  const durPaso = () => 60 / bpm / 4;
  function programar() {
    while (proximo < ctx.currentTime + 0.12) {
      const t = proximo + (paso % 2 ? (SWING - 0.5) * 2 * durPaso() : 0);
      const P = patron, i = paso;
      const suenan = FILAS.filter(f => P[f][i]);
      if (P.pez[i]) bombo(t);
      if (P.limon[i]) hat(t, false, P.pez[i] ? 0.6 : 1);
      if (P.cebolla[i]) caja(t);
      if (P.coctel[i]) shaker(t, false, i % 2 ? 0.7 : 1);
      if (P.ostra[i]) rim(t);
      if (P.cerveza[i]) destape(t);
      if (P.tubo[i]) vidrio(t);
      if (P.matraz[i]) burbuja(t);
      if (P.aji[i]) bajo(t, P.aji[i].nota, P.aji[i].acento, durPaso() * (P.aji[(i + 1) % 16] ? 1 : 1.6));
      const espera = Math.max(0, (t - ctx.currentTime) * 1000);
      setTimeout(() => { if (tocando) oyentes.forEach(fn => fn(i, suenan)); }, espera);
      proximo += durPaso();
      paso = (paso + 1) % 16;
    }
  }
  function play() {
    if (!asegurar() || tocando) return;
    tocando = true; paso = 0; proximo = ctx.currentTime + 0.06;
    programar();
    timer = setInterval(programar, 25);
  }
  function stop() {
    tocando = false; clearInterval(timer); timer = 0;
    oyentes.forEach(fn => fn(-1, []));
  }

  /* ---------- grooves de "acid" ----------
     Cinco bases armadas a mano en clave minimal / high-tech (Brejcha, Hawtin):
     x = golpe; en el bajo, número = semitonos sobre La, ! = acento, - = nada.
     Sobre la base elegida se hace una variación al azar: se mueven un par de
     golpes, el bajo se transpone, se cambian acentos y se suman adornos de lab. */
  const GROOVES = [
    { nombre: 'rodante',
      pez: 'x...x...x...x...', cebolla: '....x.......x...', limon: '..x...x...x...x.', coctel: 'xxxxxxxxxxxxxxxx', ostra: '...x..x....x..x.',
      aji: '- - 0 0! - 0 12 0 - - 0 3! - 0 12 0' },
    { nombre: 'brejcha',
      pez: 'x...x...x...x...', cebolla: '....x.......x..x', limon: '..x...x...x...x.', coctel: '.x.x.x.x.x.x.x.x', ostra: '......x.......x.',
      aji: '- 0 - 12! - 0 - 7 - 0 - 12! - 0 3 -' },
    { nombre: 'minimal',
      pez: 'x...x...x...x...', cebolla: '....x.......x...', limon: '..x...x...x...xx', coctel: '................', ostra: '...x..x...x..x..',
      aji: '- - - 0! - - 0 - - - 1! - - 0 - -', tubo: '.......x........' },
    { nombre: 'acid',
      pez: 'x...x...x...x...', cebolla: '....x.......x...', limon: 'x.x.x.x.x.x.x.x.', coctel: '.xxx.xxx.xxx.xxx', ostra: '..............x.',
      aji: '- 0 0! 12 - 0 3 0! - 0 0 12! - 7 0 10' },
    { nombre: 'quebrado',
      pez: 'x.....x...x.....', cebolla: '....x.......x...', limon: '..x.x.x...x.x.xx', coctel: '.x...x...x...x..', ostra: '...x.....x...x..',
      aji: '0! - - 0 - 12 - 0 - - 3! - 0 - 12 -', matraz: '...x.......x....' }
  ];
  const golpes = txt => [...txt].map(c => c === 'x' || null);
  const bajos = (txt, trans) => txt.split(' ').map(tk => tk === '-' ? null : { nota: parseInt(tk, 10) + trans, acento: tk.endsWith('!') });
  function mover(fila, n) {
    for (let k = 0; k < n; k++) {
      const i = Math.floor(r() * 16);
      if (i % 4 === 0 && fila === patron.pez) continue;   // el bombo en negras no se toca
      fila[i] = fila[i] ? null : true;
    }
  }
  function azar() {
    limpiar();
    const G = GROOVES[Math.floor(r() * GROOVES.length)], P = patron;
    for (const f of ['pez', 'cebolla', 'limon', 'coctel', 'ostra', 'tubo', 'matraz', 'cerveza']) if (G[f]) P[f] = golpes(G[f]);
    const trans = [0, 0, 0, -2, 3, 5][Math.floor(r() * 6)];
    P.aji = bajos(G.aji, trans);
    // variación: un par de golpes que cambian, acentos que se mueven, una nota que salta de octava
    mover(P.limon, 2); mover(P.ostra, 1);
    if (r() < 0.4) mover(P.pez, 1);
    P.aji.forEach((n, i) => { if (n && r() < 0.25) n.acento = !n.acento; if (n && r() < 0.12) n.nota += 12; });
    // adornos de lab: entre uno y dos, pocos golpes
    const adornos = ['tubo', 'matraz', 'cerveza'].sort(() => r() - 0.5).slice(0, 1 + Math.floor(r() * 2));
    for (const f of adornos) if (!G[f]) { const i = [3, 7, 11, 15][Math.floor(r() * 4)]; P[f][i] = true; if (r() < 0.4) P[f][(i + 8) % 16] = true; }
  }
  function limpiar() { FILAS.forEach(f => patron[f].fill(null)); }
  function alternar(fila, i) {
    patron[fila][i] = patron[fila][i] ? null : (fila === 'aji' ? notaAzar() : true);
    return !!patron[fila][i];
  }
  function fijarBpm(n) { bpm = Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(n))); return bpm; }
  function silenciar(si) {
    mudo = si;
    if (master) master.gain.setTargetAtTime(si ? 0 : 0.8, ctx.currentTime, 0.02);
  }

  return {
    asegurar, tocar, play, stop, azar, limpiar, alternar, silenciar, fijarBpm, patron,
    get bpm() { return bpm; },
    alPaso(fn) { oyentes.push(fn); },
    get tocando() { return tocando; },
    get mudo() { return mudo; }
  };
}
