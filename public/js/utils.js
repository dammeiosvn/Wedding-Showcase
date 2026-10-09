export const baseURL = new URL('./', document.baseURI);
export function assetURL(relative, kind = 'image') {
  if (typeof relative !== 'string' || relative.includes('\\') || relative.startsWith('/') || relative.split('/').some(part => part === '..' || part === '.')) throw new Error('Đường dẫn tài nguyên không hợp lệ.');
  const prefix = kind === 'audio' ? 'audio/' : 'assets/photos/';
  if (!relative.startsWith(prefix)) throw new Error('Tài nguyên nằm ngoài thư mục cho phép.');
  const result = new URL(relative.split('/').map(encodeURIComponent).join('/'), baseURL);
  if (result.origin !== baseURL.origin || !result.pathname.startsWith(baseURL.pathname + prefix)) throw new Error('Đường dẫn tài nguyên không hợp lệ.');
  return result.href;
}
export function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}
export function imageButton(image, { kind = 'gallery', eager = false } = {}) {
  const button = element('button', 'photo-button'); button.type = 'button'; button.dataset.photo = image.id;
  button.setAttribute('aria-label', `Xem ảnh: ${image.alt}`);
  const img = element('img');
  img.width = image.width; img.height = image.height; img.alt = image.alt;
  img.loading = eager ? 'eager' : 'lazy'; img.decoding = 'async';
  if (eager) img.fetchPriority = 'high';
  const variants = kind === 'gallery' ? image.variants.filter(v => Math.max(v.width, v.height) <= 960) : image.variants;
  const selected = variants.length ? variants : [image.variants[0]];
  img.src = assetURL(kind === 'gallery' ? image.thumbnail : selected[Math.min(1, selected.length - 1)].src);
  img.srcset = selected.map(v => `${assetURL(v.src)} ${v.width}w`).join(', ');
  img.sizes = kind === 'gallery' ? '(min-width: 1200px) 550px, 50vw' : kind === 'hero' ? '(min-width: 1600px) 1450px, 100vw' : '(min-width: 700px) 55vw, 100vw';
  if (image.focalPoint) img.style.objectPosition = `${image.focalPoint[0]}% ${image.focalPoint[1]}%`;
  img.addEventListener('error', () => {
    button.dataset.failed = 'true';
    button.append(element('span', 'image-failure', 'Ảnh chưa tải được. Chạm để thử bản đầy đủ.'));
  }, { once: true });
  button.append(img); return button;
}
export async function fetchAlbum() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(new URL('data/album.json', baseURL), { cache: 'no-cache', signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const album = await response.json();
    if (album.schemaVersion !== 1 || !Array.isArray(album.images) || !Array.isArray(album.chapters) || typeof album.version !== 'string' || !album.hero || !album.footer || !album.intro) throw new Error('Album không hợp lệ.');
    const ids = new Set();
    for (const image of album.images) {
      if (!image.id || ids.has(image.id) || !Number.isFinite(image.width) || !Number.isFinite(image.height) || image.width <= 0 || image.height <= 0 || !Array.isArray(image.variants) || !image.variants.length || typeof image.alt !== 'string') throw new Error('Dữ liệu ảnh không hợp lệ.');
      ids.add(image.id); assetURL(image.src); assetURL(image.thumbnail);
      for (const variant of image.variants) { assetURL(variant.src); if (!(variant.width > 0 && variant.height > 0)) throw new Error('Biến thể ảnh không hợp lệ.'); }
    }
    for (const chapter of album.chapters) if (!Array.isArray(chapter.imageIds) || !Array.isArray(chapter.featuredIds) || [...chapter.imageIds, ...chapter.featuredIds].some(id => !ids.has(id))) throw new Error('Dữ liệu chương không hợp lệ.');
    return album;
  } finally { clearTimeout(timeout); }
}
