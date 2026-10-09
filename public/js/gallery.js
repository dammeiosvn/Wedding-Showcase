import { element, imageButton } from './utils.js';

export function createGallery(album, reveal) {
  const byId = new Map(album.images.map(image => [image.id, image]));
  const chaptersRoot = document.querySelector('#chapters');
  const moreChapters = document.querySelector('#more-chapters');
  let chapterCount = 0;
  const appendChapters = () => {
    const end = Math.min(chapterCount + 6, album.chapters.length);
    for (; chapterCount < end; chapterCount++) {
      const chapter = album.chapters[chapterCount];
      const article = element('article', 'chapter');
      const inner = element('div', 'chapter-inner'); const heading = element('div', 'chapter-heading reveal');
      heading.append(element('span', 'chapter-number', String(chapterCount + 1).padStart(2, '0')));
      const copy = element('div'); copy.append(element('h3', '', chapter.title));
      if (chapter.description) copy.append(element('p', 'chapter-description', chapter.description));
      heading.append(copy); inner.append(heading);
      const photos = element('div', 'chapter-photos');
      for (const id of chapter.featuredIds) {
        const photo = byId.get(id); const figure = element('figure', 'reveal');
        figure.append(imageButton(photo, { kind: 'story' }));
        if (photo.caption) figure.append(element('figcaption', '', photo.caption));
        photos.append(figure);
      }
      inner.append(photos);
      const link = element('a', 'chapter-link', `Xem ${chapter.imageIds.length} khoảnh khắc`);
      link.href = '#gallery'; link.append(element('span', '', '↗'));
      link.addEventListener('click', () => select(chapter.id));
      inner.append(link); article.append(inner); chaptersRoot.append(article); reveal(article);
    }
    moreChapters.hidden = chapterCount >= album.chapters.length;
  };
  moreChapters.addEventListener('click', appendChapters);
  const grid = document.querySelector('#gallery-grid');
  const filters = document.querySelector('#gallery-filters');
  const more = document.querySelector('#more-photos');
  const progress = document.querySelector('#gallery-progress');
  let members = album.images, shown = 0;
  const pageSize = Math.max(12, Math.min(48, album.gallery?.pageSize || 24));
  function append() {
    const end = Math.min(shown + pageSize, members.length);
    const fragment = document.createDocumentFragment();
    while (shown < end) {
      const row = element('div', 'gallery-row');
      const first = members[shown++]; const items = [first];
      if (first.width / first.height <= 2.2 && shown < end && members[shown].width / members[shown].height <= 2.2) items.push(members[shown++]);
      if (items.length === 1) row.classList.add('single', first.width < first.height ? 'portrait' : 'landscape');
      for (const photo of items) {
        const button = imageButton(photo); button.style.flex = `${photo.width / photo.height} 1 0%`;
        button.append(element('span', 'photo-count', photo.caption || 'Xem ảnh ↗')); row.append(button);
      }
      fragment.append(row);
    }
    grid.append(fragment); more.hidden = shown >= members.length;
    progress.textContent = `${shown} / ${members.length} khoảnh khắc`;
  }
  function select(id = '') {
    members = id ? album.images.filter(photo => photo.chapter === id) : album.images;
    shown = 0; grid.replaceChildren();
    for (const button of filters.children) button.setAttribute('aria-pressed', String(button.dataset.chapter === id));
    document.querySelector('#gallery-count').textContent = `${members.length} KHOẢNH KHẮC`;
    append();
  }
  for (const chapter of [{ id: '', title: 'Tất cả' }, ...album.chapters]) {
    const button = element('button', '', chapter.title); button.type = 'button'; button.dataset.chapter = chapter.id;
    button.setAttribute('aria-pressed', String(chapter.id === '')); button.addEventListener('click', () => select(chapter.id)); filters.append(button);
  }
  more.addEventListener('click', append);
  appendChapters(); select();
  return { select };
}
