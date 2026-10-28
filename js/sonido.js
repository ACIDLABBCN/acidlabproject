/* ACID LAB · PORTADA · sonido.js
   Kit de house de bar sintetizado con Web Audio, sin archivos: cálido, con
   swing y bajo de volumen. Cada ingrediente es un instrumento:
   - pez: bombo redondo (seno que cae de ~120 Hz al grave, cola larga y suave)
   - limón: hat abierto del contratiempo (cuadradas inarmónicas, cola media)
   - cebolla: clap (cuatro golpes de ruido y una cola corta con eco)
   - cóctel: shaker (ruido agudo con ataque suave, como la coctelera)
   - ostra: rimshot de madera (triángulo con un poco de eco)
   - ají: bajo house (sierra con filtro cerrado, sin resonancia, más un seno de sub)
   - matraz: pad de acorde (menor con novena o séptima, sierras apenas
     desafinadas, entra lento y se apaga antes del acorde siguiente, con sala)
   - tubo de ensayo: conga (golpe afinado que sube y cae)
   - cerveza: destape (pop que cae de tono y un burbujeo corto)
   Al tocarlos sueltos (var = true) cada golpe varía un poco: otra nota, otro
   largo, otro tono. En el secuenciador suenan parejos, salvo el ají y el
   matraz, que guardan su nota y su acorde por paso.
   El contexto de audio se crea con el primer toque (iPhone y Android lo exigen).
   Secuenciador: 32 pasos (dos compases), 115 bpm de partida (ajustable de 100
   a 140, en vivo), con swing marcado, programado por adelantado con el reloj del audio.
   alPaso(paso, nombres) avisa cuando suena. */

export const PASOS = 32;
export const BPM = 115, BPM_MIN = 100, BPM_MAX = 140;
// orden de las filas del secuenciador: del grave al agudo, el bajo al final
export const FILAS = ['pez', 'cebolla', 'limon', 'coctel', 'ostra', 'cerveza', 'tubo', 'matraz', 'aji'];
const SWING = 0.58;
// notas del bajo en semitonos sobre La 1 (55 Hz): La menor dórico, sin la segunda bemol del acid
export const ESCALA = [0, 0, 0, 12, 3, 5, 7, 7, 10, -2];
// acordes del pad en semitonos sobre La 3 (220 Hz), cuatro voces abiertas: Lam9, Rem9, Famaj9, Mim7
const ACORDES = [[-12, 3, 7, 14], [-7, 0, 3, 7], [-16, 4, 7, 11], [-17, 2, 5, 10]];

export function crearSonido() {
  let ctx = null, master = null, ruido = null, mudo = false;
  // salida: adonde conectan los instrumentos. Los toques sueltos van directo al master; el
  // secuenciador usa un bus propio que se apaga en stop (así no quedan notas ya programadas sonando).
  // eco: la entrada del delay (y su sala) que acompaña a esa salida. Hay dos, armados una sola
  // vez: el de los toques sueltos y el del secuenciador, que cuelga de fxSeq y se calla en stop
  let salida = null, eco = null, ecoMaster = null, ecoSeq = null, fxSeq = null, bus = null, ciclo = 0;
  const patron = Object.fromEntries(FILAS.map(f => [f, Array(PASOS).fill(null)]));
  let tocando = false, paso = 0, proximo = 0, timer = 0, bpm = BPM;
  const oyentes = [], oyentesEstado = [];
  const r = Math.random;
  const entre = (a, b) => a + (b - a) * r();

  function asegurar() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    // avisa cuando el audio pasa de esperando a sonando (el primer toque lo destraba)
    ctx.onstatechange = () => oyentesEstado.forEach(fn => fn());
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.12;
    master = ctx.createGain();
    master.gain.value = mudo ? 0 : 0.7;
    // limitador al final: con pad, sala, eco y bajo juntos la suma no pasa del techo ni se rompe
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.1;
    master.connect(comp).connect(lim).connect(ctx.destination);
    salida = master;
    eco = ecoMaster = crearEco(master);
    fxSeq = ctx.createGain();
    fxSeq.gain.value = 0;
    fxSeq.connect(master);
    ecoSeq = crearEco(fxSeq);
    const n = ctx.sampleRate;
    ruido = ctx.createBuffer(1, n, n);
    const d = ruido.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = r() * 2 - 1;
    return ctx;
  }
  // primer gesto real (touchend, click, tecla): reanuda el audio. En iPhone un pointerdown
  // táctil no cuenta como gesto, así que lo que se tocó antes queda programado y suena aquí
  function desbloquear() {
    if (!asegurar()) return;
    if (ctx.state !== 'running') ctx.resume();
    const s = ctx.createBufferSource();
    s.buffer = ctx.createBuffer(1, 1, 22050);
    s.connect(ctx.destination); s.start(0);
  }

  // sala: respuesta de ruido estéreo que se apaga en ~3 s, armada una vez
  let salaIR = null;
  function crearSala(destino) {
    if (!salaIR) {
      const n = Math.floor(ctx.sampleRate * 3.2);
      salaIR = ctx.createBuffer(2, n, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = salaIR.getChannelData(c);
        for (let i = 0; i < n; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / n, 3.2);
      }
    }
    const entrada = ctx.createGain(), cv = ctx.createConvolver(), lp = ctx.createBiquadFilter(), sale = ctx.createGain();
    cv.buffer = salaIR;
    lp.type = 'lowpass'; lp.frequency.value = 3500;
    sale.gain.value = 0.55;
    entrada.connect(cv).connect(lp).connect(sale).connect(destino);
    return entrada;
  }
  // delay de corchea con puntillo, oscuro y con poca realimentación, más la sala.
  // eco.sala es la entrada de la reverb que va con ese mismo destino
  function crearEco(destino) {
    const entrada = ctx.createGain(), d = ctx.createDelay(1), fb = ctx.createGain(), lp = ctx.createBiquadFilter(), sale = ctx.createGain();
    d.delayTime.value = 60 / bpm * 0.75;
    lp.type = 'lowpass'; lp.frequency.value = 2200;
    fb.gain.value = 0.38; sale.gain.value = 0.5;
    entrada.connect(d).connect(lp).connect(fb).connect(d);
    lp.connect(sale).connect(destino);
    entrada.retardo = d;
    entrada.sala = crearSala(destino);
    return entrada;
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
    const o = ctx.createOscillator(), g = ctx.createGain(), sat = saturador(1.3);
    const grave = v ? entre(44, 54) : 48, cola = v ? entre(0.4, 0.6) : 0.5;
    o.type = 'sine';
    o.frequency.setValueAtTime(v ? entre(105, 135) : 120, t);
    o.frequency.exponentialRampToValueAtTime(grave, t + 0.07);
    env(g, t, 1.05, 0.004, cola);
    o.connect(sat).connect(g).connect(salida);
    o.start(t); o.stop(t + cola + 0.03);
    const gc = ctx.createGain();
    env(gc, t, 0.08, 0.001, 0.01);
    gc.connect(salida);
    ruidoA(t, 0.015, [['bandpass', 1800, 0.8]], gc);
  }

  function hat(t, v = false, vel = 1) {
    const g = ctx.createGain(), bp = ctx.createBiquadFilter(), hp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = v ? entre(7500, 10000) : 8500; bp.Q.value = 0.7;
    hp.type = 'highpass'; hp.frequency.value = 6500;
    const largo = v ? entre(0.12, 0.26) : 0.17;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.13 * vel, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.05 * vel, t + largo * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + largo);
    bp.connect(hp).connect(g).connect(salida);
    const base = v ? entre(38, 44) : 40;
    for (const k of [2, 3, 4.16, 5.43, 6.79, 8.21]) {
      const o = ctx.createOscillator();
      o.type = 'square'; o.frequency.value = base * k;
      o.connect(bp); o.start(t); o.stop(t + largo + 0.01);
    }
    // un poco de aire de ruido para que no suene a timbre metálico
    const gr = ctx.createGain();
    env(gr, t, 0.05 * vel, 0.003, largo * 0.8);
    gr.connect(salida);
    ruidoA(t, largo, [['highpass', 9000]], gr);
  }

  function caja(t, v = false) {
    const g = ctx.createGain();
    g.gain.value = 0.85;
    g.connect(salida);
    const envio = ctx.createGain();
    envio.gain.value = 0.14;
    g.connect(envio).connect(eco);
    const sala = ctx.createGain();
    sala.gain.value = 0.2;
    g.connect(sala).connect(eco.sala);
    const f = v ? entre(1000, 1500) : 1200, cola = v ? entre(0.16, 0.26) : 0.2;
    // clap: cuatro golpes sueltos y una cola de ruido, sin cuerpo tonal
    [0, 0.009, 0.019, 0.03].forEach((d, i) => {
      const gi = ctx.createGain(), ultimo = i === 3;
      env(gi, t + d, ultimo ? 0.4 : 0.3, 0.001, ultimo ? cola : 0.01);
      gi.connect(g);
      ruidoA(t + d, ultimo ? cola : 0.014, [['bandpass', f, 1.1], ['highpass', 700]], gi);
    });
  }

  function shaker(t, v = false, vel = 1) {
    const g = ctx.createGain();
    const largo = v ? entre(0.06, 0.16) : 0.08;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.11 * vel, t + largo * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + largo);
    g.connect(salida);
    ruidoA(t, largo, [['highpass', v ? entre(4500, 7500) : 6000], ['peaking', 9000, 1]], g);
  }

  function rim(t, v = false) {
    const o = ctx.createOscillator(), g = ctx.createGain(), hp = ctx.createBiquadFilter();
    o.type = 'triangle';
    const f = v ? entre(700, 1000) : 820;
    o.frequency.setValueAtTime(f * 1.3, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.008);
    hp.type = 'highpass'; hp.frequency.value = 400;
    env(g, t, 0.2, 0.001, v ? entre(0.03, 0.06) : 0.04);
    o.connect(hp).connect(g).connect(salida);
    const envio = ctx.createGain();
    envio.gain.value = 0.25;
    g.connect(envio).connect(eco);
    o.start(t); o.stop(t + 0.08);
  }

  function bajo(t, nota = 0, acento = false, dur = 0.11) {
    const fr = 55 * Math.pow(2, nota / 12);
    const o = ctx.createOscillator(), sub = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(), gs = ctx.createGain(), sat = saturador(1.4);
    o.type = 'sawtooth'; o.frequency.setValueAtTime(fr, t);
    sub.type = 'sine'; sub.frequency.setValueAtTime(fr, t);
    // filtro cerrado y sin resonancia: el golpe se redondea en vez de chillar
    f.type = 'lowpass'; f.Q.value = 0.9;
    f.frequency.setValueAtTime(acento ? 900 : 620, t);
    f.frequency.exponentialRampToValueAtTime(240, t + 0.16);
    gs.gain.value = 0.9;
    const pico = acento ? 0.2 : 0.16;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(pico, t + 0.015);
    g.gain.linearRampToValueAtTime(pico * 0.8, t + dur * 0.6);
    // release largo: la nota se apaga de a poco en vez de cortarse
    const suelta = Math.max(0.3, dur * 1.2), fin = t + dur + suelta;
    g.gain.exponentialRampToValueAtTime(0.0001, fin);
    o.connect(f).connect(sat).connect(g);
    sub.connect(gs).connect(g);
    g.connect(salida);
    for (const x of [o, sub]) { x.start(t); x.stop(fin + 0.05); }
  }
  // pad: cada voz son dos sierras apenas desafinadas por un filtro oscuro que se abre lento.
  // Entra suave, se sostiene y se apaga antes del acorde siguiente; la cola la pone la sala
  // conEco: cuánto va al delay (el acorde dub corto manda mucho más, para que se pierda en las repeticiones)
  function pad(t, acorde = 0, trans = 0, dur = 0.8, conEco = 0.12) {
    const f = ctx.createBiquadFilter(), g = ctx.createGain();
    const ataque = Math.min(0.45, dur * 0.3), suelta = Math.max(ataque + 0.05, dur * 0.8), fin = suelta + 0.7;
    f.type = 'lowpass'; f.Q.value = 0.3;
    f.frequency.setValueAtTime(450, t);
    f.frequency.linearRampToValueAtTime(1150, t + ataque + 0.3);
    f.frequency.exponentialRampToValueAtTime(600, t + fin);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.035, t + ataque);
    g.gain.linearRampToValueAtTime(0.032, t + suelta);
    g.gain.exponentialRampToValueAtTime(0.0001, t + fin);
    f.connect(g).connect(salida);
    const envio = ctx.createGain(), sala = ctx.createGain();
    envio.gain.value = conEco; sala.gain.value = 1.6;
    g.connect(envio).connect(eco);
    g.connect(sala).connect(eco.sala);
    for (const s of ACORDES[acorde % ACORDES.length]) {
      for (const cents of [-4, 4]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = 220 * Math.pow(2, (s + trans) / 12);
        o.detune.value = cents;
        o.connect(f); o.start(t); o.stop(t + fin + 0.02);
      }
    }
  }
  function tom(t, v = false) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    const f = v ? entre(260, 360) : 300;
    // conga: sube un pelo al golpe y cae corta
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 1.25, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.02);
    o.frequency.exponentialRampToValueAtTime(f * 0.94, t + 0.2);
    env(g, t, 0.32, 0.002, v ? entre(0.14, 0.24) : 0.18);
    o.connect(g).connect(salida);
    o.start(t); o.stop(t + 0.28);
    const gc = ctx.createGain();
    env(gc, t, 0.07, 0.001, 0.01);
    gc.connect(salida);
    ruidoA(t, 0.015, [['bandpass', 2200, 1.5]], gc);
  }
  function destape(t, v = false) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    const f0 = v ? entre(500, 800) : 640;
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * 0.25, t + 0.035);
    env(g, t, 0.42, 0.001, 0.06);
    o.connect(g).connect(salida);
    o.start(t); o.stop(t + 0.08);
    const gp = ctx.createGain();
    env(gp, t, 0.25, 0.001, 0.02);
    gp.connect(salida);
    ruidoA(t, 0.02, [['bandpass', 1600, 1.2]], gp);
    // burbujeo: ruido agudo que se apaga
    const gf = ctx.createGain();
    gf.gain.setValueAtTime(0.0001, t + 0.02);
    gf.gain.exponentialRampToValueAtTime(0.07, t + 0.05);
    gf.gain.exponentialRampToValueAtTime(0.0001, t + (v ? entre(0.18, 0.35) : 0.24));
    gf.connect(salida);
    ruidoA(t + 0.02, 0.36, [['highpass', 6500]], gf);
  }
  const notaAzar = () => ({ nota: ESCALA[Math.floor(r() * ESCALA.length)], acento: r() < 0.3 });
  const acordeAzar = () => ({ acorde: Math.floor(r() * ACORDES.length), trans: 0 });

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
    else if (nombre === 'matraz') pad(t, acordeAzar().acorde, 0, entre(1.2, 2));
    else if (nombre === 'tubo') tom(t, true);
    else if (nombre === 'cerveza') destape(t, true);
  }

  /* ---------- secuenciador ---------- */
  const durPaso = () => 60 / bpm / 4;
  // el pad dura hasta el próximo acorde marcado (como mucho el loop entero)
  function largoPad(i) {
    let n = 1;
    while (n < PASOS && !patron.matraz[(i + n) % PASOS]) n++;
    return durPaso() * n;
  }
  function programar() {
    // si el navegador frenó el intervalo (pestaña de fondo, ahorro de energía), no se recuperan
    // los pasos perdidos: se retoma desde ahora, sin amontonar notas en el pasado
    if (proximo < ctx.currentTime - 0.03) proximo = ctx.currentTime + 0.02;
    const antes = salida, ecoAntes = eco;
    salida = bus; eco = ecoSeq;
    while (proximo < ctx.currentTime + 0.2) {
      const t = proximo + (paso % 2 ? (SWING - 0.5) * 2 * durPaso() : 0);
      const P = patron, i = paso;
      const suenan = FILAS.filter(f => P[f][i]);
      if (P.pez[i]) bombo(t);
      if (P.limon[i]) hat(t, false, P.pez[i] ? 0.6 : 1);
      if (P.cebolla[i]) caja(t);
      if (P.coctel[i]) shaker(t, false, i % 2 ? 0.6 : (i % 4 === 2 ? 1 : 0.8));
      if (P.ostra[i]) rim(t);
      if (P.cerveza[i]) destape(t);
      if (P.tubo[i]) tom(t);
      const m = P.matraz[i];
      if (m) m.corto ? pad(t, m.acorde, m.trans, durPaso() * 2, 0.5) : pad(t, m.acorde, m.trans, largoPad(i));
      if (P.aji[i]) bajo(t, P.aji[i].nota, P.aji[i].acento, durPaso() * (P.aji[(i + 1) % PASOS] ? 1 : 1.6));
      const espera = Math.max(0, (t - ctx.currentTime) * 1000);
      const c = ciclo;
      setTimeout(() => { if (tocando && c === ciclo) oyentes.forEach(fn => fn(i, suenan)); }, espera);
      proximo += durPaso();
      paso = (paso + 1) % PASOS;
    }
    salida = antes; eco = ecoAntes;
  }
  function play() {
    if (!asegurar() || tocando) return;
    tocando = true; paso = 0; proximo = ctx.currentTime + 0.06; ciclo++;
    bus = ctx.createGain();
    bus.connect(master);
    fxSeq.gain.cancelScheduledValues(ctx.currentTime);
    fxSeq.gain.setTargetAtTime(1, ctx.currentTime, 0.02);
    programar();
    timer = setInterval(programar, 25);
  }
  function stop() {
    tocando = false; clearInterval(timer); timer = 0; ciclo++;
    if (bus) { bus.gain.setTargetAtTime(0, ctx.currentTime, 0.01); const b = bus; setTimeout(() => b.disconnect(), 300); bus = null; }
    if (fxSeq) { fxSeq.gain.cancelScheduledValues(ctx.currentTime); fxSeq.gain.setTargetAtTime(0, ctx.currentTime, 0.05); }
    oyentes.forEach(fn => fn(-1, []));
  }

  /* ---------- grooves de house ----------
     Cuatro bases armadas a mano en clave de house de bar, deep y con swing:
     bombo en negras, clap en 2 y 4, hat abierto en el contratiempo. El loop
     es de dos compases: la batería se escribe de a uno y se repite; el bajo
     y el pad van escritos enteros, con un acorde por compás.
     x = golpe; en el bajo, número = semitonos sobre La, ! = acento, - = nada;
     en el pad, dígito = acorde (0 Lam9, 1 Rem9, 2 Famaj9, 3 Mim7), . = nada.
     Sobre la base elegida se hace una variación al azar: se mueven un par de
     golpes, bajo y acordes se transponen juntos, se cambian acentos y se suma
     algún adorno de lab. */
  const GROOVES = [
    { nombre: 'bar',
      pez: 'x...x...x...x...', cebolla: '....x.......x...', limon: '..x...x...x...x.', coctel: 'xxxxxxxxxxxxxxxx', ostra: '...x.....x....x.',
      aji: '0 - - 0 - - 0 - - - 12 - 0 - 10 - 5 - - 5 - - 5 - - - 17 - 5 - 3 -',
      matraz: '0...............1...............' },
    { nombre: 'deep',
      pez: 'x...x...x...x...', cebolla: '....x.......x...', limon: '..x...x...x...x.', coctel: '.x.x.x.x.x.x.x.x', ostra: '......x..x....x.',
      aji: '- - 0 - - - 0 - - - 3! - - 0 - - - - 8 - - - 8 - - - 7! - - 8 - -',
      matraz: '..0...............2.............' },
    { nombre: 'jack',
      pez: 'x...x...x...x...', cebolla: '....x.......x...', limon: '..x...x...x...x.', coctel: 'x.x.x.x.x.x.x.x.', ostra: '..x..x....x..x..',
      aji: '0! - 0 - - - 12 - 0 - - 0 - 7 - - 7! - 7 - - - 19 - 7 - - 7 - 5 - -',
      matraz: '0...............3...............', tubo: '...x......x.....' },
    { nombre: 'nocturno',
      pez: 'x...x...x...x...', cebolla: '....x.......x...', limon: '..x...x...x...x.', coctel: '................', ostra: '...x...x...x...x',
      aji: '- - - 0 - - 0 - - - - 5 - - 3 - - - - 8 - - 8 - - - - 7 - - 5 -',
      matraz: '0...............2.......3.......' }
  ];
  // la batería escrita de a un compás se repite hasta llenar el loop
  const golpes = txt => [...txt.repeat(PASOS / txt.length)].map(c => c === 'x' || null);
  const bajos = (txt, trans) => txt.split(' ').map(tk => tk === '-' ? null : { nota: parseInt(tk, 10) + trans, acento: tk.endsWith('!') });
  const acordes = (txt, trans) => [...txt].map(c => c === '.' ? null : { acorde: +c, trans });
  function mover(fila, n) {
    for (let k = 0; k < n; k++) {
      const i = Math.floor(r() * PASOS);
      if (i % 4 === 0 && fila === patron.pez) continue;   // el bombo en negras no se toca
      fila[i] = fila[i] ? null : true;
    }
  }
  function azar() {
    limpiar();
    const G = GROOVES[Math.floor(r() * GROOVES.length)], P = patron;
    for (const f of ['pez', 'cebolla', 'limon', 'coctel', 'ostra', 'tubo', 'cerveza']) if (G[f]) P[f] = golpes(G[f]);
    const trans = [0, 0, 0, -2, -4, 3][Math.floor(r() * 6)];
    P.aji = bajos(G.aji, trans);
    P.matraz = acordes(G.matraz, trans);
    // variación: el rim y el shaker se mueven un poco, acentos que cambian, una nota que salta de octava
    mover(P.ostra, 3); mover(P.coctel, 2);
    P.aji.forEach(n => { if (n && r() < 0.2) n.acento = !n.acento; if (n && r() < 0.1) n.nota += 12; });
    // adorno de lab: uno, con pocos golpes
    const f = ['tubo', 'cerveza'][Math.floor(r() * 2)];
    if (!G[f]) { const i = [7, 15, 23, 31][Math.floor(r() * 4)]; P[f][i] = true; if (r() < 0.4) P[f][(i + 16) % PASOS] = true; }
  }
  // beat de arranque: minimal en la línea de Villalobos. Bombo en negras y mucho espacio;
  // el groove lo llevan rims y congas cruzados entre los dos compases, el shaker sincopado
  // y bajito, un clap solo al final del loop, un bajo grave casi quieto y un acorde dub
  // (Lam9 corto) que entra dos veces y se pierde en el eco
  function fijo() {
    limpiar();
    const P = patron;
    P.pez = golpes('x...x...x...x...');
    P.limon = golpes('..x...x...x...x.');
    P.coctel = golpes('.xx..x.x.xx..x.x');
    P.ostra = golpes('...x..x....x..x...x..x.....x.x..');
    P.tubo = golpes('......x.....x..x...x..x.......x.');
    P.cebolla[28] = true;
    P.aji = bajos('- - - 0 - - - - - - 0 - - - - - - - - 0 - - - - - - - 0 - - -2 -', 0);
    P.matraz[6] = { acorde: 0, trans: 0, corto: true };
    P.matraz[22] = { acorde: 0, trans: 0, corto: true };
  }
  // la casilla recién marcada suena tal como quedó guardada (el ají con su nota, el matraz con su acorde)
  function oir(fila, i) {
    if (!asegurar()) return;
    const t = ctx.currentTime + 0.005, n = patron[fila][i];
    if (!n) return;
    if (fila === 'aji') bajo(t, n.nota, n.acento, durPaso() * 1.6);
    else if (fila === 'matraz') pad(t, n.acorde, n.trans, durPaso() * 8);
    else ({ pez: bombo, limon: hat, cebolla: caja, coctel: shaker, ostra: rim, tubo: tom, cerveza: destape })[fila](t);
  }
  function limpiar() { FILAS.forEach(f => patron[f].fill(null)); }
  function alternar(fila, i) {
    patron[fila][i] = patron[fila][i] ? null : (fila === 'aji' ? notaAzar() : fila === 'matraz' ? acordeAzar() : true);
    return !!patron[fila][i];
  }
  function fijarBpm(n) {
    bpm = Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(n)));
    // el eco sigue al tempo
    for (const e of [ecoMaster, ecoSeq]) if (e) e.retardo.delayTime.setTargetAtTime(60 / bpm * 0.75, ctx.currentTime, 0.05);
    return bpm;
  }
  function silenciar(si) {
    mudo = si;
    if (master) master.gain.setTargetAtTime(si ? 0 : 0.7, ctx.currentTime, 0.02);
  }

  return {
    asegurar, desbloquear, tocar, oir, play, stop, azar, fijo, limpiar, alternar, silenciar, fijarBpm, patron,
    get bpm() { return bpm; },
    alPaso(fn) { oyentes.push(fn); },
    alEstado(fn) { oyentesEstado.push(fn); },
    get tocando() { return tocando; },
    // el audio corre de verdad (el navegador ya recibió un toque); antes, el secuenciador espera en play
    get sonando() { return !!ctx && ctx.state === 'running'; },
    get mudo() { return mudo; }
  };
}
