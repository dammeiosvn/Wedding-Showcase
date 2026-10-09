const VERSION = '__BUILD_VERSION__';
const { baseURL, imageButton, fetchAlbum } = await import(`./utils.js?v=${VERSION}`);
const [{ createGallery }, { createLightbox }, { setupAudio }] = await Promise.all([
  import(`./gallery.js?v=${VERSION}`), import(`./lightbox.js?v=${VERSION}`), import(`./audio.js?v=${VERSION}`)
]);
let album = null, lightbox = null, registration = null, lastCheck = 0, checking = false;
let updateDismissed = false, applying = false;
const notice = document.querySelector('#update-notice');
const announcement = document.querySelector('#announcement');
const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
}, { rootMargin: '40px', threshold: .05 }) : null;
if (observer && !matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('motion');
function reveal(root = document) {
  for (const node of root.querySelectorAll('.reveal')) observer ? observer.observe(node) : node.classList.add('visible');
}
const setText = (selector, value) => { document.querySelector(selector).textContent = value || ''; };
async function load() {
  document.querySelector('#load-error').hidden = true; document.querySelector('#initial-status').hidden = false;
  try {
    album = await fetchAlbum(); lastCheck = Date.now();
    if (album.version !== VERSION) offerUpdate();
    document.title = album.title;
    setText('#hero-eyebrow', album.hero.eyebrow); setText('#hero-title', album.hero.title); setText('#hero-subtitle', album.hero.subtitle);
    setText('#footer-album', album.title); setText('#footer-title', album.footer.title); setText('#footer-message', album.footer.message);
    const empty = album.images.length === 0;
    document.querySelector('#empty').hidden = !empty;
    document.querySelector('#story').hidden = empty; document.querySelector('#gallery').hidden = empty;
    document.querySelector('.gallery-link').hidden = empty; document.querySelector('#scroll-cue').hidden = empty;
    if (!empty) {
      const cover = album.images.find(photo => photo.id === album.hero.coverId) || album.images[0];
      const media = document.querySelector('#hero-media'); media.hidden = false; media.replaceChildren(imageButton(cover, { kind: 'hero', eager: true }));
      setText('#story-title', album.intro.title); setText('#story-description', album.intro.text);
      createGallery(album, reveal); lightbox = createLightbox(album.images); reveal();
    }
    setupAudio(album.audio);
  } catch (error) {
    console.warn('Không mở được album:', error.message);
    document.querySelector('#load-error').hidden = false;
  } finally { document.querySelector('#initial-status').hidden = true; }
}
document.querySelector('#retry').addEventListener('click', load);
document.querySelector('main').addEventListener('click', event => {
  const button = event.target.closest('button[data-photo]');
  if (button) lightbox?.open(button.dataset.photo, button);
});
function offerUpdate() { if (!updateDismissed) notice.hidden = false; }
document.querySelector('#dismiss-update').addEventListener('click', () => { notice.hidden = true; updateDismissed = true; });
document.querySelector('#apply-update').addEventListener('click', async () => {
  if (applying) return;
  applying = true; lightbox?.close();
  const button = document.querySelector('#apply-update'); button.disabled = true; button.textContent = 'Đang cập nhật…';
  try { await registration?.update(); } catch { /* Current data may still be available. */ }
  const installing = registration?.installing;
  if (installing && installing.state !== 'installed' && installing.state !== 'redundant') {
    await new Promise(resolve => {
      const done = () => { clearTimeout(timer); installing.removeEventListener('statechange', changed); resolve(); };
      const changed = () => { if (installing.state === 'installed' || installing.state === 'redundant') done(); };
      const timer = setTimeout(done, 6000); installing.addEventListener('statechange', changed);
    });
  }
  if (registration?.waiting) {
    let reloaded = false;
    const reload = () => { if (!reloaded) { reloaded = true; location.reload(); } };
    navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });
    registration.waiting.postMessage({ type: 'ACTIVATE_UPDATE' }); setTimeout(reload, 3000);
  } else location.reload();
});
async function checkUpdates() {
  if (checking || !album || document.hidden || !navigator.onLine || Date.now() - lastCheck < 60000) return;
  checking = true; lastCheck = Date.now();
  try { const fresh = await fetchAlbum(); if (fresh.version !== album.version) offerUpdate(); await registration?.update(); }
  catch { /* Offline: retain the current album and stop; no retry loop. */ }
  finally { checking = false; }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkUpdates(); });
window.addEventListener('online', () => { lastCheck = 0; checkUpdates(); announcement.textContent = 'Đã có kết nối mạng.'; });
setInterval(checkUpdates, 5 * 60000);
if ('serviceWorker' in navigator) {
  const registerWorker = async () => {
    try {
      registration = await navigator.serviceWorker.register(new URL('sw.js', baseURL), { scope: baseURL.pathname, updateViaCache: 'none' });
      if (registration.waiting) offerUpdate();
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(); });
      });
    } catch (error) { console.info('Offline cache chưa khả dụng:', error.message); }
  };
  if (document.readyState === 'complete') registerWorker();
  else window.addEventListener('load', registerWorker, { once: true });
}
await load();
