import { MnemoGallery } from './mnemo-gallery';

export { type GalleryFilter, type GalleryItem, isArchive, selectItems } from './model';
export { MnemoGallery };

if (!customElements.get('mnemo-gallery')) customElements.define('mnemo-gallery', MnemoGallery);

declare global {
  interface HTMLElementTagNameMap {
    'mnemo-gallery': MnemoGallery;
  }
}
