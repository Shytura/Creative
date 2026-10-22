import { type Archive, parseArchive } from '@mnemo/core';
import { beforeAll, describe, expect, it } from 'vitest';
import sample from '../../../apps/embed-demo/public/sample-collection.json';
import { isArchive, type MnemoGallery, selectItems } from '../src';

describe('sample export', () => {
  it('is a valid Mnemo archive', () => {
    expect(() => parseArchive(sample)).not.toThrow();
  });
});

describe('selectItems', () => {
  const archive = parseArchive(sample);

  it('selects a collection by name, case-insensitively, in its order', () => {
    const model = selectItems(archive, { collection: 'lieblingswerke' });
    expect(model.heading).toBe('Lieblingswerke');
    expect(model.items.map((i) => i.id)).toEqual(['a1', 'a2', 'a3', 'a5']);
    expect(model.items[0]).toMatchObject({ venue: 'Oberes Belvedere', place: 'Wien' });
  });

  it('reads lists from exports of Mnemo 0.1 (artworkIds) as well', () => {
    const legacy = sample as unknown as Archive;
    expect(selectItems(legacy, { collection: 'Lieblingswerke' }).items.map((i) => i.id)).toEqual([
      'a1',
      'a2',
      'a3',
      'a5',
    ]);
  });

  it('filters and limits', () => {
    expect(selectItems(archive, { filter: 'favorites' }).items).toHaveLength(4);
    expect(selectItems(archive, { limit: 2 }).items).toHaveLength(2);
  });

  it('recognises archives structurally', () => {
    expect(isArchive(sample)).toBe(true);
    expect(isArchive({ format: 'other' })).toBe(false);
  });
});

describe('<mnemo-gallery>', () => {
  let el: MnemoGallery;

  beforeAll(() => {
    el = document.createElement('mnemo-gallery');
    el.setAttribute('collection', 'Lieblingswerke');
    document.body.append(el);
    el.data = sample;
  });

  it('renders the collection inside its shadow root', () => {
    const root = el.shadowRoot!;
    expect(root.querySelector('h2')?.textContent).toBe('Lieblingswerke');
    expect(root.querySelectorAll('figure')).toHaveLength(4);
    expect(root.querySelector('img')?.getAttribute('src')).toContain('wikimedia.org');
  });

  it('reacts to attribute changes', () => {
    el.setAttribute('limit', '1');
    expect(el.shadowRoot!.querySelectorAll('figure')).toHaveLength(1);
    el.removeAttribute('limit');
  });

  it('escapes untrusted text and drops unsafe image urls', () => {
    const evil = parseArchive(sample);
    evil.artworks[0]!.title = '<img src=x onerror=alert(1)>';
    evil.media[0]!.src = 'javascript:alert(1)';
    el.removeAttribute('collection');
    el.data = evil;
    const root = el.shadowRoot!;
    expect(root.querySelector('[onerror]')).toBeNull();
    expect(root.querySelector('.title')?.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(root.innerHTML).not.toContain('javascript:');
  });

  it('shows an error state for invalid data', () => {
    el.data = { nope: true };
    expect(el.shadowRoot!.querySelector('[role="alert"]')).not.toBeNull();
  });
});
