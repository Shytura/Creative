import type { Coords, Media, MediaDraft, MnemoStore } from '@mnemo/core';
import { resolveCommonsImage } from '@mnemo/providers';
import { extractPalette } from './palette';

const FULL_EDGE = 2400;
const THUMB_EDGE = 720;

export interface ProcessedImage {
  full: Blob;
  thumb: Blob;
  width: number;
  height: number;
  palette: string[];
  takenAt?: string;
  takenCoords?: Coords;
}

interface ExifInfo {
  takenAt?: string;
  takenCoords?: Coords;
}

async function readExif(file: Blob): Promise<ExifInfo> {
  try {
    const { default: exifr } = await import('exifr');
    const data = await exifr.parse(file, {
      gps: true,
      pick: ['DateTimeOriginal', 'CreateDate', 'latitude', 'longitude'],
    });
    if (!data) return {};
    const date: Date | undefined = data.DateTimeOriginal ?? data.CreateDate;
    const info: ExifInfo = {};
    if (date instanceof Date && !Number.isNaN(date.getTime())) info.takenAt = date.toISOString();
    if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
      info.takenCoords = { lat: data.latitude, lng: data.longitude };
    }
    return info;
  } catch {
    return {};
  }
}

function canvasFor(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.imageSmoothingQuality = 'high';
  return { canvas, ctx };
}

function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Encoding failed'))),
      'image/jpeg',
      quality,
    ),
  );
}

async function resize(bitmap: ImageBitmap, maxEdge: number, quality: number) {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const { canvas, ctx } = canvasFor(width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  return { blob: await encode(canvas, quality), width, height };
}

function paletteOf(bitmap: ImageBitmap): string[] {
  const scale = 96 / Math.max(bitmap.width, bitmap.height);
  const { ctx } = canvasFor(
    Math.max(1, Math.round(bitmap.width * scale)),
    Math.max(1, Math.round(bitmap.height * scale)),
  );
  ctx.drawImage(bitmap, 0, 0, ctx.canvas.width, ctx.canvas.height);
  return extractPalette(ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height).data);
}

/** Downscales a photo, renders a thumbnail, extracts colours and reads EXIF date/GPS. */
export async function processImage(file: Blob): Promise<ProcessedImage> {
  const [exif, bitmap] = await Promise.all([
    readExif(file),
    createImageBitmap(file, { imageOrientation: 'from-image' }),
  ]);
  try {
    const full = await resize(bitmap, FULL_EDGE, 0.86);
    const thumb = await resize(bitmap, THUMB_EDGE, 0.8);
    return {
      full: full.blob,
      thumb: thumb.blob,
      width: full.width,
      height: full.height,
      palette: paletteOf(bitmap),
      ...exif,
    };
  } finally {
    bitmap.close();
  }
}

/**
 * Downloads a remote image so it is available offline. Returns null when the host does not
 * allow cross-origin access; callers then keep the URL as reference only.
 */
export async function downloadImage(
  url: string,
  signal?: AbortSignal,
): Promise<ProcessedImage | null> {
  try {
    const response = await fetch(url, { mode: 'cors', signal });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) return null;
    return await processImage(blob);
  } catch {
    return null;
  }
}

export async function saveProcessedImage(
  store: MnemoStore,
  image: ProcessedImage,
  extra: Partial<MediaDraft> = {},
): Promise<Media> {
  return store.media.create(
    {
      mime: 'image/jpeg',
      width: image.width,
      height: image.height,
      palette: image.palette,
      takenAt: image.takenAt,
      takenCoords: image.takenCoords,
      ...extra,
    },
    { full: image.full, thumb: image.thumb },
  );
}

/** Stores a remote image locally if possible, otherwise as URL reference. */
export async function saveRemoteImage(
  store: MnemoStore,
  url: string,
  alt?: string,
): Promise<Media> {
  const downloadUrl = await resolveCommonsImage(url, 1600, { locale: 'de' }).catch(() => url);
  const image = await downloadImage(downloadUrl);
  if (image) return saveProcessedImage(store, image, { remoteUrl: url, alt });
  return store.media.create({ remoteUrl: url, alt });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}
