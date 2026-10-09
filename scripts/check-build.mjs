import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

export async function checkBuild(root) {
  const dist = path.join(root, 'dist');
  const album = JSON.parse(await fs.readFile(path.join(dist, 'data/album.json'), 'utf8'));
  if (album.schemaVersion !== 1 || !Array.isArray(album.images) || !Array.isArray(album.chapters)) throw new Error('Schema album không hợp lệ.');
  const ids = new Set();
  const local = async relative => {
    if (!relative || relative.startsWith('/') || relative.includes('\\') || relative.split('/').includes('..') || /^[a-z]+:/i.test(relative)) throw new Error(`Đường dẫn không hợp lệ: ${relative}`);
    await fs.access(path.join(dist, relative));
  };
  for (const image of album.images) {
    if (ids.has(image.id) || image.width <= 0 || image.height <= 0) throw new Error(`Ảnh không hợp lệ: ${image.id}`);
    ids.add(image.id);
    for (const variant of image.variants) {
      await local(variant.src);
      const meta = await sharp(path.join(dist, variant.src)).metadata();
      if (meta.width !== variant.width || meta.height !== variant.height || meta.exif || meta.xmp || meta.iptc || meta.icc || meta.width > image.width || meta.height > image.height) throw new Error(`Kích thước/metadata sai: ${variant.src}`);
    }
    await local(image.thumbnail); await local(image.src);
  }
  for (const chapter of album.chapters) for (const id of [...chapter.imageIds, ...chapter.featuredIds]) if (!ids.has(id)) throw new Error(`Chương trỏ tới ảnh không tồn tại: ${id}`);
  if (album.audio) await local(album.audio.src);
  for (const file of ['index.html', 'css/style.css', 'js/app.js', 'js/gallery.js', 'js/lightbox.js', 'js/audio.js', 'js/utils.js', 'manifest.webmanifest', 'sw.js']) {
    await local(file);
    if ((await fs.readFile(path.join(dist, file), 'utf8')).includes('__BUILD_VERSION__')) throw new Error(`Chưa thay phiên bản: ${file}`);
  }
  for (const size of [180, 192, 512]) {
    const meta = await sharp(path.join(dist, `icons/icon-${size}.png`)).metadata();
    if (meta.width !== size || meta.height !== size || meta.format !== 'png') throw new Error('Icon PWA không hợp lệ.');
  }
  const manifest = JSON.parse(await fs.readFile(path.join(dist, 'manifest.webmanifest'), 'utf8'));
  if (manifest.scope !== './' || manifest.start_url !== './') throw new Error('Manifest không tương thích project subpath.');
  return album;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  checkBuild(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')).then(album => console.log(`Kiểm tra build đạt: ${album.images.length} ảnh.`)).catch(error => { console.error(error); process.exitCode = 1; });
}
