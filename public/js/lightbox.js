import { assetURL } from './utils.js';

export function createLightbox(images) {
  const dialog = document.querySelector('#lightbox');
  const stage = document.querySelector('#lightbox-stage');
  const image = document.querySelector('#lightbox-image');
  const status = document.querySelector('#lightbox-status');
  const count = document.querySelector('#lightbox-count');
  const caption = document.querySelector('#lightbox-caption');
  const previous = document.querySelector('#lightbox-prev');
  const next = document.querySelector('#lightbox-next');
  const zoom = document.querySelector('#lightbox-zoom');
  const controller = new AbortController();
  const on = (target, event, handler, options = {}) => target.addEventListener(event, handler, { ...options, signal: controller.signal });
  const pointers = new Map();
  let index = 0, scale = 1, x = 0, y = 0, frame = 0, sequence = 0;
  let savedScroll = 0, bodyStyle = '', trigger = null, mode = '', origin = null, multi = false, moved = false, lastTap = null;
  const clamp = () => {
    const limitX = Math.max(0, (image.offsetWidth * scale - stage.clientWidth) / 2);
    const limitY = Math.max(0, (image.offsetHeight * scale - stage.clientHeight) / 2);
    x = Math.max(-limitX, Math.min(limitX, x)); y = Math.max(-limitY, Math.min(limitY, y));
  };
  const paint = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0; clamp();
      image.style.transform = `translate3d(${x}px,${y}px,0) scale(${scale})`;
      zoom.textContent = scale > 1.01 ? 'Thu về' : 'Phóng to';
      zoom.setAttribute('aria-label', scale > 1.01 ? 'Thu ảnh về kích thước ban đầu' : 'Phóng to ảnh');
      stage.dataset.zoomed = String(scale > 1.01);
    });
  };
  const reset = () => { scale = 1; x = 0; y = 0; pointers.clear(); mode = ''; lastTap = null; paint(); };
  const toggleZoom = point => {
    if (scale > 1.01) { scale = 1; x = 0; y = 0; }
    else {
      scale = 2.5;
      const rect = stage.getBoundingClientRect();
      x = point ? -(point.x - rect.left - rect.width / 2) * (scale - 1) : 0;
      y = point ? -(point.y - rect.top - rect.height / 2) * (scale - 1) : 0;
    }
    paint();
  };
  const show = target => {
    index = Math.max(0, Math.min(images.length - 1, target)); reset();
    const photo = images[index]; const token = ++sequence;
    count.textContent = `${index + 1} / ${images.length}`; caption.textContent = photo.caption || '';
    previous.disabled = index === 0; next.disabled = index === images.length - 1;
    status.textContent = 'Đang tải ảnh…'; image.style.opacity = '0'; image.alt = photo.alt;
    image.width = photo.width; image.height = photo.height; image.src = assetURL(photo.src);
    image.decode().then(() => {
      if (token !== sequence) return;
      status.textContent = ''; image.style.opacity = '1'; paint();
    }).catch(() => {
      if (token !== sequence) return;
      status.textContent = 'Chưa tải được ảnh. Hãy thử ảnh khác hoặc kiểm tra kết nối.';
    });
  };
  const close = () => {
    if (!dialog.open) return;
    dialog.close(); ++sequence; pointers.clear();
    if (frame) { cancelAnimationFrame(frame); frame = 0; }
    document.body.style.cssText = bodyStyle;
    const behavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, savedScroll); document.documentElement.style.scrollBehavior = behavior;
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    image.removeAttribute('src'); image.style.transform = ''; stage.dataset.zoomed = 'false';
    document.dispatchEvent(new Event('lightboxclosed'));
  };
  const open = (id, source) => {
    const target = images.findIndex(photo => photo.id === id);
    if (target < 0 || dialog.open) return;
    trigger = source; savedScroll = window.scrollY; bodyStyle = document.body.style.cssText;
    document.body.style.position = 'fixed'; document.body.style.top = `-${savedScroll}px`;
    document.body.style.left = '0'; document.body.style.right = '0'; document.body.style.width = '100%';
    dialog.showModal(); show(target); document.querySelector('#lightbox-close').focus({ preventScroll: true });
  };
  on(document.querySelector('#lightbox-close'), 'click', close);
  on(dialog, 'cancel', event => { event.preventDefault(); close(); });
  on(previous, 'click', () => show(index - 1)); on(next, 'click', () => show(index + 1));
  on(zoom, 'click', () => toggleZoom());
  on(dialog, 'keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); show(index + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  const point = event => ({ x: event.clientX, y: event.clientY });
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const startPinch = () => {
    const [a, b] = [...pointers.values()];
    mode = 'pinch'; multi = true;
    origin = { distance: Math.max(1, distance(a, b)), midpoint: midpoint(a, b), scale, x, y };
  };
  on(stage, 'pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault(); stage.setPointerCapture(event.pointerId); pointers.set(event.pointerId, point(event));
    if (pointers.size === 1) {
      multi = false; moved = false; mode = scale > 1.01 ? 'pan' : 'swipe';
      origin = { ...point(event), xOffset: x, yOffset: y, time: performance.now() };
    } else if (pointers.size === 2) startPinch();
  });
  on(stage, 'pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    event.preventDefault(); pointers.set(event.pointerId, point(event));
    if (pointers.size >= 2 && mode === 'pinch') {
      const [a, b] = [...pointers.values()]; const middle = midpoint(a, b);
      const nextScale = Math.max(1, Math.min(4, origin.scale * distance(a, b) / origin.distance));
      const factor = nextScale / origin.scale; const rect = stage.getBoundingClientRect();
      const anchorX = origin.midpoint.x - rect.left - rect.width / 2;
      const anchorY = origin.midpoint.y - rect.top - rect.height / 2;
      x = origin.x * factor + anchorX * (1 - factor) + middle.x - origin.midpoint.x;
      y = origin.y * factor + anchorY * (1 - factor) + middle.y - origin.midpoint.y;
      scale = nextScale; moved = true; paint();
    } else if (pointers.size === 1 && origin) {
      const dx = event.clientX - origin.x, dy = event.clientY - origin.y;
      if (Math.hypot(dx, dy) > 8) moved = true;
      if (mode === 'pan') { x = origin.xOffset + dx; y = origin.yOffset + dy; paint(); }
    }
  });
  const endPointer = (event, cancelled = false) => {
    if (!pointers.has(event.pointerId)) return;
    const wasSingle = pointers.size === 1;
    pointers.delete(event.pointerId);
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    if (pointers.size >= 2) startPinch();
    else if (pointers.size === 1) {
      const remaining = [...pointers.values()][0]; mode = 'pan';
      origin = { ...remaining, xOffset: x, yOffset: y, time: performance.now() };
    } else {
      if (!cancelled && wasSingle && !multi && origin) {
        const dx = event.clientX - origin.x, dy = event.clientY - origin.y;
        if (mode === 'swipe' && scale <= 1.01 && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4 && performance.now() - origin.time < 900) {
          show(index + (dx < 0 ? 1 : -1));
        } else if (!moved) {
          const now = performance.now(); const tap = point(event);
          if (lastTap && now - lastTap.time < 320 && distance(lastTap, tap) < 28) { toggleZoom(tap); lastTap = null; }
          else lastTap = { ...tap, time: now };
        }
      }
      if (scale < 1.04) { scale = 1; x = 0; y = 0; paint(); }
      mode = ''; origin = null;
    }
  };
  on(stage, 'pointerup', event => endPointer(event));
  on(stage, 'pointercancel', event => endPointer(event, true));
  // Both touch and mouse double-taps are handled once by pointerup.
  on(stage, 'dblclick', event => { event.preventDefault(); });
  const resizeObserver = new ResizeObserver(() => { if (dialog.open) { scale = 1; x = 0; y = 0; paint(); } });
  resizeObserver.observe(stage);
  return { open, close, get isOpen() { return dialog.open; }, destroy() { close(); controller.abort(); resizeObserver.disconnect(); } };
}
