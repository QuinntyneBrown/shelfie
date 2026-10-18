// Shows one slide at a time. ?slide=N selects slide N (0-based) so the builder can screenshot each.
const slides = [...document.querySelectorAll('section')];
const parts = (document.body.dataset.parts ?? '').split('|');
const n = Number(new URLSearchParams(location.search).get('slide') ?? 0);
const slide = slides[n];
slide.classList.add('active');
const part = parts[Number(slide.dataset.part ?? 0)] ?? '';
document.body.insertAdjacentHTML(
  'afterbegin',
  `<header><span><strong>Shelfie</strong> · Video ${document.body.dataset.videoNumber} · ${document.body.dataset.videoTitle}</span><span>${part}</span></header>` +
    `<div class="progress" style="width:${((n + 1) / slides.length) * 100}%"></div>`,
);
if (slide.dataset.clip) slide.insertAdjacentHTML('beforeend', `<div class="clip-frame${slide.dataset.clipClass ? ' ' + slide.dataset.clipClass : ''}"></div>`);
document.documentElement.dataset.ready = String(slides.length);
