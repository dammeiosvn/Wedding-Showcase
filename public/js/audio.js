import { assetURL } from './utils.js';

export function setupAudio(config) {
  const button = document.querySelector('#music');
  if (!config?.src) return () => {};
  let src;
  try { src = assetURL(config.src, 'audio'); } catch { return () => {}; }
  const audio = new Audio(); audio.preload = 'none'; audio.loop = config.loop !== false; audio.src = src;
  const controller = new AbortController(); const options = { signal: controller.signal };
  let intent = false, generation = 0;
  const sync = () => {
    const playing = !audio.paused;
    button.setAttribute('aria-pressed', String(playing)); button.setAttribute('aria-label', playing ? 'Tắt nhạc nền' : 'Bật nhạc nền');
  };
  const pause = () => { intent = false; generation++; audio.pause(); sync(); };
  button.hidden = false;
  button.addEventListener('click', async () => {
    if (intent || !audio.paused) { pause(); return; }
    intent = true; const token = ++generation;
    try {
      // Call play synchronously inside the user's gesture; never await a fetch first.
      await audio.play();
      if (!intent || token !== generation || document.hidden) audio.pause();
      sync();
    } catch {
      if (token !== generation) return;
      intent = false; sync(); document.querySelector('#announcement').textContent = 'Chưa phát được nhạc. Hãy chạm lại để thử.';
    }
  }, options);
  audio.addEventListener('play', sync, options); audio.addEventListener('pause', sync, options);
  audio.addEventListener('error', () => { pause(); button.hidden = true; }, options);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); }, options);
  window.addEventListener('pagehide', pause, options);
  return () => { pause(); controller.abort(); audio.removeAttribute('src'); audio.load(); button.hidden = true; };
}
