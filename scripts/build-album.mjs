import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const formats = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'variant' });
const compare = (a, b) => collator.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0);
const hash = value => createHash('sha256').update(value).digest('hex');
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const own = (value, key) => Object.hasOwn(value, key) ? value[key] : undefined;
const text = (value, fallback = '') => typeof value === 'string' ? value : fallback;
const number = (value, fallback) => Number.isFinite(value) ? value : fallback;
const label = value => value.replace(/[-_]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());

// Configuration is a lookup key, never a path that is read from the filesystem.
export function photoKey(value) {
  if (typeof value !== 'string' || !value || value.includes('\\') || value.startsWith('/') || /^[a-z]+:/i.test(value)) return null;
  const key = value.startsWith('photos/') ? value.slice(7) : value;
  return key.split('/').some(part => !part || part === '.' || part === '..') ? null : key;
}

async function scan(directory, relative = '', warn) {
  let entries;
  try { entries = await fs.readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const files = [];
  for (const entry of entries.sort((a, b) => compare(a.name, b.name))) {
    if (entry.name.startsWith('.')) continue;
    const key = relative ? `${relative}/${entry.name}` : entry.name;
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) { warn(`Bỏ qua liên kết tượng trưng: photos/${key}`); continue; }
    if (entry.isDirectory()) files.push(...await scan(absolute, key, warn));
    else if (formats.has(path.extname(entry.name).toLowerCase())) files.push(key);
    else warn(`Bỏ qua định dạng không hỗ trợ: photos/${key}`);
  }
  return files;
}

async function rejectLinks(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error(`Không cho phép symlink trong public/: ${entry.name}`);
    if (entry.isDirectory()) await rejectLinks(path.join(directory, entry.name));
  }
}

export async function buildAlbum(root, { log = console.log, warn = message => console.warn(`[Cảnh báo] ${message}`) } = {}) {
  const temporary = path.join(root, '.dist-build');
  await fs.rm(temporary, { recursive: true, force: true });
  await fs.mkdir(temporary, { recursive: true });
  let config = {};
  try {
    config = object(JSON.parse(await fs.readFile(path.join(root, 'data/album.config.json'), 'utf8')));
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error(`album.config.json không hợp lệ: ${error.message}`);
  }
  const publicRoot = path.join(root, 'public');
  await rejectLinks(publicRoot);
  await fs.cp(publicRoot, temporary, { recursive: true });
  await fs.mkdir(path.join(temporary, 'assets/photos'), { recursive: true });
  await fs.mkdir(path.join(temporary, 'data'), { recursive: true });
  const sources = await scan(path.join(root, 'photos'), '', warn);
  const sourceSet = new Set(sources);
  const overrides = new Map();
  for (const [reference, value] of Object.entries(object(config.photos))) {
    const key = photoKey(reference);
    if (!key || !sourceSet.has(key)) warn(`Cấu hình ảnh không tồn tại hoặc đường dẫn không hợp lệ: ${reference}`);
    else overrides.set(key, object(value));
  }
  const resolve = reference => {
    if (!reference) return null;
    const key = photoKey(reference);
    if (key && sourceSet.has(key)) return key;
    warn(`Tham chiếu ảnh không tồn tại hoặc không hợp lệ: ${reference}`);
    return null;
  };
  const hero = object(config.hero);
  const cover = resolve(hero.cover);
  const images = [];
  sharp.cache({ memory: 48, files: 0, items: 32 });
  sharp.concurrency(2);
  // Process sequentially to keep CI memory bounded, even for large albums.
  for (const source of sources) {
    const input = await fs.readFile(path.join(root, 'photos', source));
    const meta = overrides.get(source) || {};
    const id = hash(source).slice(0, 20);
    const fingerprint = hash(input).slice(0, 16);
    let info;
    try { info = await sharp(input, { limitInputPixels: 100_000_000 }).metadata(); }
    catch (error) { throw new Error(`Không đọc được photos/${source}: ${error.message}`); }
    if (!info.width || !info.height || (info.pages || 1) > 1) throw new Error(`Ảnh không hợp lệ hoặc ảnh động: photos/${source}`);
    const swap = [5, 6, 7, 8].includes(info.orientation);
    const width = swap ? info.height : info.width;
    const height = swap ? info.width : info.height;
    const longest = Math.max(width, height);
    const sizes = [...new Set([480, 960, 1920].map(size => Math.min(size, longest)))];
    const variants = [];
    try {
      for (const size of sizes) {
        const filename = `${id}-${fingerprint}-${size}.webp`;
        const result = await sharp(input, { limitInputPixels: 100_000_000 }).rotate()
          .resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: size <= 480 ? 80 : 88, effort: 4 })
          .toFile(path.join(temporary, 'assets/photos', filename));
        variants.push({ src: `assets/photos/${filename}`, width: result.width, height: result.height });
      }
    } catch (error) { throw new Error(`Không xử lý được photos/${source}: ${error.message}`); }
    const directory = path.posix.dirname(source);
    const chapter = directory === '.' ? 'moments' : directory;
    let focalPoint = null;
    if (meta.focalPoint != null) {
      const point = meta.focalPoint;
      if (Array.isArray(point) && point.length === 2 && point.every(v => Number.isFinite(v) && v >= 0 && v <= 100)) focalPoint = point;
      else warn(`focalPoint phải là [x, y] từ 0 đến 100: ${source}`);
    }
    images.push({ id, source, src: variants.at(-1).src, thumbnail: variants[0].src,
      variants, width, height, alt: text(meta.alt, `${text(own(object(config.chapters), chapter)?.title, label(chapter))} — ${path.parse(source).name}`),
      caption: text(meta.caption), chapter, order: number(meta.order, 1000), focalPoint, featured: meta.featured === true });
  }
  const chapterOrder = Array.isArray(config.chapterOrder) ? config.chapterOrder : [];
  const chapterIds = [...new Set(images.map(image => image.chapter))].sort((a, b) => {
    const rank = id => chapterOrder.includes(id) ? chapterOrder.indexOf(id) : 1000;
    return rank(a) - rank(b) || compare(a, b);
  });
  const chapters = chapterIds.map(id => {
    const meta = object(own(object(config.chapters), id));
    const picks = Array.isArray(meta.featured) ? meta.featured.map(resolve).filter(Boolean) : [];
    const members = images.filter(image => image.chapter === id).sort((a, b) => a.order - b.order || compare(a.source, b.source));
    const featured = [...new Set([...picks.filter(key => members.some(image => image.source === key)), ...members.filter(image => image.featured).map(image => image.source)])];
    if (!featured.length) featured.push(...members.slice(0, 2).map(image => image.source));
    return { id, title: text(meta.title, label(id)), description: text(meta.description),
      imageIds: members.map(image => image.id), featuredIds: featured.slice(0, 3).map(key => members.find(image => image.source === key).id) };
  });
  images.sort((a, b) => chapterIds.indexOf(a.chapter) - chapterIds.indexOf(b.chapter) || a.order - b.order || compare(a.source, b.source));
  let audio = null;
  const audioConfig = object(config.audio);
  if (audioConfig.src) {
    const src = photoKey(audioConfig.src);
    if (!src?.startsWith('audio/') || !/\.(mp3|m4a|ogg|wav)$/i.test(src)) warn('Nhạc phải nằm trong public/audio/ với đường dẫn audio/ten-tep.mp3.');
    else {
      try {
        const stat = await fs.stat(path.join(publicRoot, src));
        if (stat.isFile() && stat.size) audio = { src, loop: audioConfig.loop !== false };
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  }
  const album = { schemaVersion: 1, title: text(config.title, 'Wedding Showcase'),
    hero: { eyebrow: text(hero.eyebrow, 'OUR LOVE STORY'), title: text(hero.title, 'Một đời. Một người.'),
      subtitle: text(hero.subtitle, 'Và một tình yêu không có ngày kết thúc.'),
      coverId: (images.find(image => image.source === cover) || images[0])?.id || null },
    intro: { title: text(config.intro?.title, 'Tình yêu, qua từng khung hình.'), text: text(config.intro?.text) },
    footer: { title: text(config.footer?.title, 'Câu chuyện còn tiếp.'), message: text(config.footer?.message) },
    gallery: { pageSize: Math.round(Math.max(12, Math.min(48, number(config.gallery?.pageSize, 24)))) },
    audio, chapters, images };
  // Version covers code, configuration, images and audio, so content-only deploys update the shell too.
  const versionHash = createHash('sha256').update(JSON.stringify(album));
  async function digest(directory) {
    for (const entry of (await fs.readdir(directory, { withFileTypes: true })).sort((a, b) => compare(a.name, b.name))) {
      if (entry.isDirectory()) await digest(path.join(directory, entry.name));
      else versionHash.update(path.relative(temporary, path.join(directory, entry.name))).update(await fs.readFile(path.join(directory, entry.name)));
    }
  }
  await digest(temporary);
  album.version = versionHash.digest('hex').slice(0, 20);
  await fs.writeFile(path.join(temporary, 'data/album.json'), JSON.stringify(album));
  for (const filename of ['index.html', 'sw.js', 'js/app.js', 'js/gallery.js', 'js/lightbox.js', 'js/audio.js']) {
    const target = path.join(temporary, filename);
    let content = await fs.readFile(target, 'utf8');
    content = content.replaceAll('__BUILD_VERSION__', album.version);
    if (filename.startsWith('js/')) content = content.replaceAll("from './utils.js'", `from './utils.js?v=${album.version}'`);
    if (filename === 'index.html') content = content.replaceAll('__ALBUM_TITLE__', album.title.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]));
    await fs.writeFile(target, content);
  }
  await fs.writeFile(path.join(temporary, '.nojekyll'), '');
  await fs.rm(path.join(root, 'dist'), { recursive: true, force: true });
  await fs.rename(temporary, path.join(root, 'dist'));
  log(`Đã tạo album: ${images.length} ảnh, ${chapters.length} chương. Phiên bản ${album.version}.`);
  return album;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  buildAlbum(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')).catch(error => { console.error(`[Build thất bại] ${error.message}`); process.exitCode = 1; });
}
