/* ACID LAB · PORTADA · figuras.js
   Ingredientes y material de laboratorio como "muestras", con el lenguaje del
   brand book: cada uno parte de su forma básica (▲ producto de mar, ● lo
   ácido, ■ cócteles) y lleva encima el dibujo en línea técnica fina, como las
   formas sobre las fotos del book. El material de lab va con su forma solo en
   contorno (la parte técnica de la imagen).
   Clases: fo forma sólida, fc forma en contorno, li línea técnica, lr detalle
   relleno con el color de la línea. Los colores salen de variables CSS por
   familia (ver portada.css). Provisorios hasta que el diseñador de la marca
   entregue los definitivos: mismo viewBox 0 0 100 100 y mismas clases. */

const svg = (familia, cuerpo) => `<svg class="fig-svg" data-familia="${familia}" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${cuerpo}</svg>`;
const TRI = 'M50 6 L95 90 L5 90 Z', CIRC = '<circle class="fo" cx="50" cy="50" r="44"/>', CUAD = 'M10 10 H90 V90 H10 Z';

export const FAMILIA = { pez: 'mar', ostra: 'mar', limon: 'acido', aji: 'acido', cebolla: 'acido', coctel: 'coctel', matraz: 'lab', tubo: 'lab', cerveza: 'coctel' };

export const FIGURAS = {
  pez: svg('mar', `<path class="fo" d="${TRI}"/>
    <path class="li" d="M16 62 C28 47 54 43 76 54 C80 56 84 59 87 62 C80 68 60 75 41 73 C29 72 21 68 16 62 Z"/>
    <path class="li" d="M16 62 L5 51 L8 62 L5 73 Z"/>
    <path class="li" d="M62 51 C58 58 58 66 62 71 M24 64 C40 66 58 64 82 61 M34 54 L38 60 M42 51 L46 58 M50 50 L54 57 M44 47 L50 41 L58 45"/>
    <circle class="li" cx="73" cy="59" r="2.6"/>`),
  ostra: svg('mar', `<path class="fo" d="${TRI}"/>
    <path class="li" d="M52 22 C63 25 71 37 74 50 C78 64 75 78 64 85 C56 90 43 90 36 83 C27 74 25 60 30 46 C34 34 42 22 52 22 Z"/>
    <path class="li" d="M52 29 C60 33 66 45 67 58 M45 33 C39 45 36 58 38 72 M58 80 C64 76 68 68 68 60"/>
    <path class="li" d="M42 56 C46 49 55 49 59 55 C63 61 59 69 51 70 C45 70 41 64 42 58"/>
    <circle class="lr" cx="51" cy="61" r="3.4"/>`),
  limon: svg('acido', `${CIRC}
    <circle class="li" cx="50" cy="50" r="33"/><circle class="li" cx="50" cy="50" r="27"/>
    <path class="li" d="M50 23 V77 M23 50 H77 M31 31 L69 69 M69 31 L31 69"/>
    <circle class="lr" cx="50" cy="50" r="3"/>`),
  aji: svg('acido', `${CIRC}
    <path class="li" d="M32 30 C41 28 48 33 52 42 C57 55 67 65 81 74 C84 76 83 80 79 80 C61 80 43 71 33 57 C26 47 25 35 32 30 Z"/>
    <path class="li" d="M27 33 C29 25 39 23 43 29 M35 26 C34 19 30 15 24 14 M40 41 C45 53 55 63 68 71"/>`),
  cebolla: svg('acido', `${CIRC}
    <path class="li" d="M50 16 C54 24 59 29 67 35 C79 44 82 57 77 68 C72 79 61 84 50 84 C39 84 28 79 23 68 C18 57 21 44 33 35 C41 29 46 24 50 16 Z"/>
    <path class="li" d="M50 34 C59 41 69 49 68 60 C67 70 59 75 50 75 C41 75 33 70 32 60 C31 49 41 41 50 34 Z"/>
    <path class="li" d="M50 51 C55 55 60 59 59 64 C58 68 54 69 50 69 C46 69 42 68 41 64 C40 59 45 55 50 51 Z M44 86 L42 92 M50 86 V93 M56 86 L58 92"/>`),
  coctel: svg('coctel', `<path class="fo" d="${CUAD}"/>
    <path class="li" d="M24 28 C30 54 70 54 76 28 Z M26 34 C40 39 60 39 74 34 M50 51 V76 M35 79 C44 75 56 75 65 79"/>
    <circle class="lr" cx="40" cy="31" r="1.8"/><circle class="lr" cx="50" cy="32" r="1.8"/><circle class="lr" cx="60" cy="31" r="1.8"/>
    <circle class="li" cx="74" cy="24" r="8"/><path class="li" d="M74 16 V32 M66 24 H82"/>`),
  matraz: svg('lab', `<path class="fc" d="${TRI}"/>
    <path class="li" d="M42 14 H58 M45 14 V40 L24 80 C22 85 24 88 29 88 H71 C76 88 78 85 76 80 L55 40 V14"/>
    <path class="li" d="M31 68 H69 M58 48 H62 M61 56 H65 M64 64 H68"/>
    <circle class="li" cx="44" cy="76" r="3"/><circle class="li" cx="54" cy="72" r="2"/><circle class="li" cx="50" cy="81" r="1.6"/>`),
  tubo: svg('lab', `<path class="fc" d="${CUAD}"/>
    <path class="li" d="M40 14 H60 M43 14 V74 C43 85 57 85 57 74 V14"/>
    <path class="li" d="M43 50 H57 M57 26 H52 M57 34 H54 M57 42 H52"/>
    <circle class="li" cx="48" cy="64" r="2.4"/><circle class="li" cx="52" cy="72" r="1.6"/>`),
  cerveza: svg('coctel', `<path class="fo" d="${CUAD}"/>
    <path class="li" d="M45 12 H55 V16 H45 Z M46 16 V30 C46 36 37 40 37 50 V84 C37 87 39 88 42 88 H58 C61 88 63 87 63 84 V50 C63 40 54 36 54 30 V16"/>
    <path class="li" d="M37 54 H63 V74 H37 Z M42 60 H58 M42 66 H54"/>
    <circle class="li" cx="47" cy="44" r="1.6"/><circle class="li" cx="52" cy="40" r="1.2"/><circle class="li" cx="50" cy="47" r="1"/>`)
};
