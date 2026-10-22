import {
  type Archive,
  archiveToSnapshot,
  createArchive,
  type MediaBlobs,
  type MnemoStore,
  mergeDuplicateCreators,
  parseArchive,
  subsetArchive,
  todayIsoDate,
} from '@mnemo/core';
import { blobToDataUrl, dataUrlToBlob } from './media';

const MANIFEST = 'mnemo.json';

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};
const MIME_TYPES = Object.fromEntries(Object.entries(EXTENSIONS).map(([m, e]) => [e, m]));

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Full backup: JSON manifest plus all locally stored images, as a zip file. */
export async function exportBackup(store: MnemoStore): Promise<void> {
  const { zip } = await import('fflate');
  const snapshot = await store.snapshot();
  const archive = createArchive(snapshot);
  const files: Record<string, [Uint8Array, { level: 0 | 6 }]> = {
    [MANIFEST]: [new TextEncoder().encode(JSON.stringify(archive)), { level: 6 }],
  };
  for (const media of snapshot.media) {
    if (!media.hasBlob) continue;
    const full = await store.media.getBlob(media.id, 'full');
    const thumb = await store.media.getBlob(media.id, 'thumb');
    if (full)
      files[`media/${media.id}.full.${EXTENSIONS[full.type] ?? 'jpg'}`] = [
        new Uint8Array(await full.arrayBuffer()),
        { level: 0 },
      ];
    if (thumb && thumb !== full)
      files[`media/${media.id}.thumb.${EXTENSIONS[thumb.type] ?? 'jpg'}`] = [
        new Uint8Array(await thumb.arrayBuffer()),
        { level: 0 },
      ];
  }
  const data = await new Promise<Uint8Array>((resolve, reject) =>
    zip(files, (err, out) => (err ? reject(err) : resolve(out))),
  );
  download(
    new Blob([data as BlobPart], { type: 'application/zip' }),
    `mnemo-backup-${todayIsoDate()}.zip`,
  );
}

/**
 * Self-contained JSON with thumbnails inlined. This is the format the embeddable
 * `<mnemo-gallery>` widget reads.
 */
export async function exportShareable(store: MnemoStore, collectionId?: string): Promise<void> {
  const snapshot = await store.snapshot();
  const sources = new Map<string, string>();
  for (const media of snapshot.media) {
    const thumb = media.hasBlob ? await store.media.getBlob(media.id, 'thumb') : undefined;
    const src = thumb ? await blobToDataUrl(thumb) : media.remoteUrl;
    if (src) sources.set(media.id, src);
  }
  let archive: Archive = createArchive(snapshot, (id) => sources.get(id));
  const collection = collectionId
    ? snapshot.collections.find((c) => c.id === collectionId)
    : undefined;
  if (collection) archive = subsetArchive(archive, collection.items);
  const name = collection
    ? collection.name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-')
    : 'sammlung';
  download(new Blob([JSON.stringify(archive)], { type: 'application/json' }), `mnemo-${name}.json`);
}

export interface ImportResult {
  artworks: number;
  places: number;
}

/** Imports a backup zip or a shareable JSON file. */
export async function importArchive(
  store: MnemoStore,
  file: File,
  mode: 'merge' | 'replace',
): Promise<ImportResult> {
  const blobs = new Map<string, MediaBlobs>();
  let archive: Archive;

  if (file.name.endsWith('.zip') || file.type === 'application/zip') {
    const { unzipSync } = await import('fflate');
    const entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
    const manifest = entries[MANIFEST];
    if (!manifest) throw new Error(`${MANIFEST} missing in archive`);
    archive = parseArchive(JSON.parse(new TextDecoder().decode(manifest)));
    for (const [path, data] of Object.entries(entries)) {
      const match = path.match(/^media\/(.+)\.(full|thumb)\.(\w+)$/);
      if (!match?.[1] || !match[2] || !match[3]) continue;
      const entry = blobs.get(match[1]) ?? {};
      entry[match[2] as 'full' | 'thumb'] = new Blob([data as BlobPart], {
        type: MIME_TYPES[match[3].toLowerCase()] ?? 'image/jpeg',
      });
      blobs.set(match[1], entry);
    }
  } else {
    archive = parseArchive(JSON.parse(await file.text()));
    for (const media of archive.media) {
      if (media.src?.startsWith('data:'))
        blobs.set(media.id, { thumb: await dataUrlToBlob(media.src) });
    }
  }

  const snapshot = archiveToSnapshot(archive);
  // Images that were only referenced by URL in a shareable export stay remote.
  snapshot.media = snapshot.media.map((m) => {
    const src = archive.media.find((a) => a.id === m.id)?.src;
    return !m.remoteUrl && src?.startsWith('http') ? { ...m, remoteUrl: src } : m;
  });
  await store.restore(snapshot, blobs, mode);
  // Someone else's export may name the same people under other ids.
  if (mode === 'merge') await mergeDuplicateCreators(store);
  return { artworks: snapshot.artworks.length, places: snapshot.places.length };
}
