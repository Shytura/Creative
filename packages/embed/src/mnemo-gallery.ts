import type { Archive } from '@mnemo/core';
import {
  type GalleryFilter,
  type GalleryItem,
  type GalleryModel,
  isArchive,
  selectItems,
} from './model';
import { styles } from './styles';

const TEXT = {
  de: {
    loading: 'Sammlung wird geladen …',
    empty: 'Noch keine Werke.',
    error: 'Die Sammlung konnte nicht geladen werden.',
    works: 'Werke',
    close: 'Schließen',
    prev: 'Vorheriges Werk',
    next: 'Nächstes Werk',
  },
  en: {
    loading: 'Loading collection …',
    empty: 'No artworks yet.',
    error: 'The collection could not be loaded.',
    works: 'works',
    close: 'Close',
    prev: 'Previous artwork',
    next: 'Next artwork',
  },
};

const escapeHtml = (value: string | undefined) =>
  (value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Only http(s) and inline image data may end up in `src` attributes. */
const safeImage = (url: string | undefined) =>
  url && (/^https?:\/\//.test(url) || url.startsWith('data:image/')) ? url : undefined;

const FILTERS: GalleryFilter[] = ['all', 'favorites', 'seen', 'wishlist'];

/**
 * `<mnemo-gallery>` renders a Mnemo export (see `exportShareable` in the app) on any page.
 *
 * Attributes: `src` (URL of the JSON export), `collection` (name or id), `filter`
 * (`all|favorites|seen|wishlist`), `limit`, `theme` (`light|dark|auto`), `columns`, `heading`,
 * `lang` (`de|en`). Instead of `src`, the export can be assigned to the `data` property.
 *
 * Emits `mnemo-select` with the artwork as `detail` when an item is opened.
 */
export class MnemoGallery extends HTMLElement {
  static observedAttributes = [
    'src',
    'collection',
    'filter',
    'limit',
    'theme',
    'columns',
    'heading',
    'lang',
  ];

  #root: ShadowRoot;
  #archive: Archive | null = null;
  #model: GalleryModel = { items: [] };
  #state: 'idle' | 'loading' | 'error' | 'ready' = 'idle';
  #abort: AbortController | undefined;
  #index = -1;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: 'open' });
    this.#root.addEventListener('click', (e) => this.#onClick(e));
    this.#root.addEventListener('keydown', (e) => this.#onKey(e as KeyboardEvent));
  }

  get data(): Archive | null {
    return this.#archive;
  }

  set data(value: unknown) {
    if (isArchive(value)) {
      this.#archive = value;
      this.#state = 'ready';
      this.#update();
    } else {
      this.#state = 'error';
      this.#render();
    }
  }

  connectedCallback() {
    if (this.getAttribute('src') && !this.#archive) void this.#load();
    else this.#render();
  }

  disconnectedCallback() {
    this.#abort?.abort();
  }

  attributeChangedCallback(name: string, oldValue: string | null, value: string | null) {
    if (oldValue === value || !this.isConnected) return;
    if (name === 'src') void this.#load();
    else this.#update();
  }

  get #text() {
    const lang = (this.getAttribute('lang') ?? document.documentElement.lang ?? 'de').slice(0, 2);
    return lang === 'en' ? TEXT.en : TEXT.de;
  }

  async #load() {
    const src = this.getAttribute('src');
    if (!src) return;
    this.#abort?.abort();
    this.#abort = new AbortController();
    this.#state = 'loading';
    this.#render();
    try {
      const response = await fetch(src, { signal: this.#abort.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.data = await response.json();
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      this.#state = 'error';
      this.#render();
    }
  }

  #update() {
    if (this.#archive) {
      const filter = this.getAttribute('filter') as GalleryFilter | null;
      this.#model = selectItems(this.#archive, {
        collection: this.getAttribute('collection'),
        filter: filter && FILTERS.includes(filter) ? filter : 'all',
        limit: Number(this.getAttribute('limit')) || undefined,
      });
    }
    this.#render();
  }

  #render() {
    const t = this.#text;
    const columns = Number(this.getAttribute('columns'));
    if (columns > 0) this.style.setProperty('--mnemo-columns', String(Math.min(columns, 6)));

    let body: string;
    if (this.#state === 'loading' || this.#state === 'idle')
      body = `<p class="state" role="status">${t.loading}</p>`;
    else if (this.#state === 'error') body = `<p class="state" role="alert">${t.error}</p>`;
    else if (this.#model.items.length === 0) body = `<p class="state">${t.empty}</p>`;
    else
      body = `<div class="grid">${this.#model.items.map((item, i) => this.#figure(item, i)).join('')}</div>`;

    const heading = this.getAttribute('heading') ?? this.#model.heading;
    this.#root.innerHTML = `
      <style>${styles}</style>
      ${
        heading
          ? `<header part="header">
              <p class="eyebrow">${this.#model.items.length} ${t.works}</p>
              <h2>${escapeHtml(heading)}</h2>
              ${this.#model.description ? `<p class="lede">${escapeHtml(this.#model.description)}</p>` : ''}
            </header>`
          : ''
      }
      ${body}
      <footer part="footer">Mnemo</footer>
      <dialog aria-label="${escapeHtml(heading ?? 'Mnemo')}"></dialog>`;
  }

  #figure(item: GalleryItem, index: number) {
    const image = safeImage(item.image);
    const meta = [item.artist, item.year].filter(Boolean).join(', ');
    const where = [item.venue, item.place].filter(Boolean).join(' · ');
    return `
      <figure part="item" style="animation-delay:${Math.min(index, 12) * 45}ms">
        <button class="item" data-index="${index}" aria-label="${escapeHtml(item.title)}">
          <div class="frame">
            ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(item.title)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : `<div class="placeholder">${escapeHtml(item.title)}</div>`}
            ${item.favorite ? '<span class="heart" aria-hidden="true">♥</span>' : ''}
          </div>
        </button>
        <figcaption part="caption">
          <p class="title">${escapeHtml(item.title)}</p>
          ${meta ? `<p class="meta">${escapeHtml(meta)}</p>` : ''}
          ${where ? `<p class="where">${escapeHtml(where)}</p>` : ''}
        </figcaption>
      </figure>`;
  }

  #open(index: number) {
    const item = this.#model.items[index];
    const dialog = this.#root.querySelector('dialog');
    if (!item || !dialog) return;
    this.#index = index;
    const t = this.#text;
    const image = safeImage(item.image);
    const many = this.#model.items.length > 1;
    dialog.innerHTML = `
      <div class="stage">${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(item.title)}" referrerpolicy="no-referrer">` : ''}</div>
      <div class="details">
        <p class="title">${escapeHtml(item.title)}</p>
        <p class="meta">${escapeHtml([item.artist, item.year, item.medium].filter(Boolean).join(' · '))}</p>
        <p class="meta">${escapeHtml([item.venue, item.place].filter(Boolean).join(', '))}</p>
        ${item.notes ? `<p class="notes">${escapeHtml(item.notes)}</p>` : ''}
      </div>
      ${many ? `<button class="nav prev" data-nav="-1" aria-label="${t.prev}">‹</button><button class="nav next" data-nav="1" aria-label="${t.next}">›</button>` : ''}
      <button class="close" data-close aria-label="${t.close}">✕</button>`;
    if (!dialog.open) dialog.showModal();
    this.dispatchEvent(
      new CustomEvent('mnemo-select', { detail: item, bubbles: true, composed: true }),
    );
  }

  #step(delta: number) {
    const count = this.#model.items.length;
    if (count > 0) this.#open((this.#index + delta + count) % count);
  }

  #onClick(e: Event) {
    const target = e.target as HTMLElement;
    const item = target.closest<HTMLElement>('[data-index]');
    if (item) return this.#open(Number(item.dataset.index));
    const nav = target.closest<HTMLElement>('[data-nav]');
    if (nav) return this.#step(Number(nav.dataset.nav));
    if (target.closest('[data-close]') || target.classList.contains('stage')) {
      this.#root.querySelector('dialog')?.close();
    }
  }

  #onKey(e: KeyboardEvent) {
    if (!this.#root.querySelector('dialog')?.open) return;
    if (e.key === 'ArrowRight') this.#step(1);
    if (e.key === 'ArrowLeft') this.#step(-1);
  }
}
