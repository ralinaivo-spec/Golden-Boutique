// Génère les icônes de l'application (écran d'accueil) à partir d'un SVG.
import sharp from 'sharp';
const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${pad ? 0 : 112}" fill="#17695A"/>
  <g transform="translate(256 262) scale(${pad ? 0.72 : 0.86}) translate(-256 -262)">
    <path d="M96 150h320l-24 56H120z" fill="#E2A72E"/>
    <path d="M120 206c0 22 18 36 39 36s40-14 40-36c0 22 18 36 39 36s39-14 39-36c0 22 18 36 39 36s39-14 39-36" fill="none" stroke="#E2A72E" stroke-width="22" stroke-linecap="round"/>
    <rect x="226" y="262" width="60" height="150" rx="10" fill="#FFFFFF"/>
    <rect x="150" y="262" width="212" height="52" rx="10" fill="#FFFFFF"/>
  </g>
</svg>`;
const out = 'public/icons/';
await sharp(Buffer.from(svg(false))).resize(192).png().toFile(out + 'icon-192.png');
await sharp(Buffer.from(svg(false))).resize(512).png().toFile(out + 'icon-512.png');
await sharp(Buffer.from(svg(true))).resize(512).png().toFile(out + 'icon-maskable-512.png');
await sharp(Buffer.from(svg(true))).resize(180).png().toFile(out + 'apple-touch-icon.png');
console.log('icônes générées');
