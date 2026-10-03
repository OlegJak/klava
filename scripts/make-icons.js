// Значки для экрана «Домой» (iPhone, Android) из знака Klava — PNG без сторонних библиотек.
// Запуск: node scripts/make-icons.js → img/apple-touch-icon.png (180), img/icon-192.png, img/icon-512.png
// Фон на весь квадрат: углы скругляет сам телефон
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Буква K из img/klava-icon.svg (координаты 0–100)
const K = 'M 25 22 Q 22 22 22 25 L 22 75 Q 22 78 25 78 L 36 78 Q 39 78 39 75 L 39 56 L 72 81 Q 77 85 77 79 ' +
  'L 77 66 Q 77 64 74 62 L 47 49 L 74 35 Q 77 34 77 31 L 77 18 Q 77 14 73 16 L 48 29 Q 43 32 39 41 L 39 25 Q 39 22 36 22 Z';
const BG = [0x42, 0x55, 0xff];
const SCALE = 0.82; // букву чуть уменьшаем: у значка нет синей рамки, как у SVG

// Контур буквы ломаной: кривые Безье — по 16 отрезков
function outline() {
  const t = K.match(/[MLQZ]|-?[\d.]+/g);
  const pts = [];
  let i = 0;
  let cur = [0, 0];
  while (i < t.length) {
    const cmd = t[i++];
    if (cmd === 'M' || cmd === 'L') { cur = [+t[i++], +t[i++]]; pts.push(cur); }
    else if (cmd === 'Q') {
      const c = [+t[i++], +t[i++]];
      const e = [+t[i++], +t[i++]];
      for (let s = 1; s <= 16; s++) {
        const u = s / 16;
        pts.push([(1 - u) ** 2 * cur[0] + 2 * (1 - u) * u * c[0] + u * u * e[0], (1 - u) ** 2 * cur[1] + 2 * (1 - u) * u * c[1] + u * u * e[1]]);
      }
      cur = e;
    }
  }
  return pts.map(([x, y]) => [50 + (x - 49.5) * SCALE, 50 + (y - 49.5) * SCALE]);
}

// Точка внутри многоугольника (правило чётности)
function inside(poly, x, y) {
  let r = false;
  for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
    const [xa, ya] = poly[a];
    const [xb, yb] = poly[b];
    if ((ya > y) !== (yb > y) && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) r = !r;
  }
  return r;
}

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size) {
  const poly = outline();
  const SS = 4; // сглаживание: 4×4 точки на пиксель
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    for (let x = 0; x < size; x++) {
      let hit = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          if (inside(poly, ((x + (sx + 0.5) / SS) / size) * 100, ((y + (sy + 0.5) / SS) / size) * 100)) hit++;
        }
      }
      const a = hit / (SS * SS);
      for (let ch = 0; ch < 3; ch++) row[1 + x * 3 + ch] = Math.round(BG[ch] + (255 - BG[ch]) * a);
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // бит на канал
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const dir = path.join(__dirname, '..', 'img');
for (const [name, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  fs.writeFileSync(path.join(dir, name), png(size));
  console.log(name, size);
}
