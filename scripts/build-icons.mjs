import { promises as fs } from 'node:fs';
import sharp from 'sharp';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#F8F7F4"/><g fill="none" stroke="#101012" stroke-width="8"><circle cx="215" cy="238" r="72"/><circle cx="297" cy="238" r="72"/></g><path d="M250 175h12v126h-12z" fill="#F8F7F4"/><text x="256" y="367" text-anchor="middle" font-family="serif" font-size="30" letter-spacing="9" fill="#101012">FOREVER</text></svg>`;
await fs.mkdir('public/icons', { recursive: true });
await fs.writeFile('public/icons/source.svg', svg);
for (const size of [180, 192, 512]) await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/icons/icon-${size}.png`);
console.log('Đã tạo icon PWA 180 / 192 / 512.');
