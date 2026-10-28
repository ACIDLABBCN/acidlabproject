/* ACID LAB · PORTADA · rotulo.js
   El titular grande rota entre frases ("abrimos pronto." y "mientras, juega
   con el secuenciador.") y cambia derritiéndose, como el logo. El derretido
   del texto es un filtro SVG (#gotea): ruido estirado en vertical que solo
   desplaza hacia abajo, así la letra gotea en columnas desparejas. Mientras
   gotea, la frase baja un poco, se estira y se apaga; la siguiente aparece
   desde arriba. El filtro va puesto solo durante el derretido.
   Con movimiento reducido no hay goteo: la frase cambia con un fundido. */

const QUIETO = [4200, 5600];      // ms que se lee cada frase (la larga, más)
const DERRITE = 1300, APARECE = 500;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = u => u * u * (3 - 2 * u);

export function iniciarRotulo({ el, filtro, frases, reduced }) {
  const disp = filtro && filtro.querySelector('feDisplacementMap');
  let i = 0, timer = 0, raf = 0;

  function pintar() {
    el.textContent = frases()[i];
    el.classList.toggle('larga', i === 1);
  }
  function animar(dur, cuadro, fin) {
    const t0 = performance.now();
    const paso = ahora => {
      const p = clamp((ahora - t0) / dur, 0, 1);
      cuadro(p);
      if (p < 1) raf = requestAnimationFrame(paso); else fin();
    };
    raf = requestAnimationFrame(paso);
  }
  function aparecer() {
    pintar();
    animar(APARECE, p => {
      const u = smooth(p);
      el.style.opacity = String(u);
      el.style.transform = `translateY(${(1 - u) * -0.06}em)`;
    }, () => { el.style.transform = ''; el.style.opacity = ''; esperar(); });
  }
  function derretir() {
    if (reduced || !disp) {
      animar(APARECE, p => { el.style.opacity = String(1 - p); }, siguiente);
      return;
    }
    el.style.filter = 'url(#gotea)';
    animar(DERRITE, p => {
      disp.setAttribute('scale', String(Math.round(90 * Math.pow(p, 1.3))));
      el.style.transform = `translateY(${0.22 * p * p}em) scaleY(${1 + 0.3 * p * p})`;
      el.style.opacity = String(1 - smooth(clamp((p - 0.4) / 0.6, 0, 1)));
    }, () => {
      el.style.filter = '';
      disp.setAttribute('scale', '0');
      siguiente();
    });
  }
  function siguiente() {
    i = (i + 1) % frases().length;
    aparecer();
  }
  function esperar() { timer = setTimeout(derretir, QUIETO[i] || QUIETO[0]); }

  pintar();
  esperar();
  // al cambiar de idioma la frase en pantalla se reescribe sin cortar la rotación
  return { renombrar: pintar, parar() { clearTimeout(timer); cancelAnimationFrame(raf); } };
}
