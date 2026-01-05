import { join, isAbsolute } from 'node:path';

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageData {
  id: string;
  data: string;  // Base64 data URL
  dimensions?: ImageDimensions;
}

// Extract dimensions from PNG data
function getPngDimensions(buffer: ArrayBuffer): ImageDimensions | null {
  const view = new DataView(buffer);
  // PNG signature check
  if (view.getUint32(0) !== 0x89504e47) return null;
  // Width and height are at bytes 16-23 (big-endian)
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  return { width, height };
}

// Extract dimensions from JPEG data
function getJpegDimensions(buffer: ArrayBuffer): ImageDimensions | null {
  const view = new DataView(buffer);
  // JPEG signature check
  if (view.getUint16(0) !== 0xffd8) return null;

  let offset = 2;
  while (offset < buffer.byteLength) {
    const marker = view.getUint16(offset);
    offset += 2;

    // SOF markers (Start Of Frame) contain dimensions
    if ((marker >= 0xffc0 && marker <= 0xffc3) ||
        (marker >= 0xffc5 && marker <= 0xffc7) ||
        (marker >= 0xffc9 && marker <= 0xffcb) ||
        (marker >= 0xffcd && marker <= 0xffcf)) {
      const height = view.getUint16(offset + 3);
      const width = view.getUint16(offset + 5);
      return { width, height };
    }

    // Skip to next marker
    if (marker === 0xffd9) break; // EOI
    if (marker === 0xffd8) continue; // SOI
    if (marker >= 0xffd0 && marker <= 0xffd7) continue; // RST markers

    const length = view.getUint16(offset);
    offset += length;
  }
  return null;
}

// Get image dimensions from buffer
function getImageDimensions(buffer: ArrayBuffer, mimeType: string): ImageDimensions | null {
  if (mimeType === 'image/png') {
    return getPngDimensions(buffer);
  }
  if (mimeType === 'image/jpeg') {
    return getJpegDimensions(buffer);
  }
  return null;
}

export interface ImageInfo {
  id: string;
  href: string;
  alt: string;
}

// Supported image MIME types
const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

function getMimeType(path: string): string | null {
  const ext = path.toLowerCase().match(/\.[^.]+$/)?.[0];
  return ext ? MIME_TYPES[ext] ?? null : null;
}

function isRemoteUrl(href: string): boolean {
  return href.startsWith('http://') || href.startsWith('https://');
}

async function loadLocalImage(
  href: string,
  basePath: string,
  id: string
): Promise<ImageData | null> {
  try {
    // Decode URL-encoded paths (e.g., Japanese characters encoded as %E6%94%B9...)
    const decodedHref = decodeURIComponent(href);
    const imagePath = isAbsolute(decodedHref) ? decodedHref : join(basePath, decodedHref);
    const mimeType = getMimeType(imagePath);

    if (!mimeType) {
      console.warn(`Unsupported image format: ${href}`);
      return null;
    }

    const file = Bun.file(imagePath);
    if (!(await file.exists())) {
      console.warn(`Image file not found: ${imagePath}`);
      return null;
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;
    const dimensions = getImageDimensions(buffer, mimeType);

    return { id, data: dataUrl, dimensions: dimensions ?? undefined };
  } catch (error) {
    console.warn(`Failed to load local image: ${href}`, error);
    return null;
  }
}

async function loadRemoteImage(
  href: string,
  id: string
): Promise<ImageData | null> {
  try {
    const response = await fetch(href, {
      headers: {
        'User-Agent': 'md2pdf/1.0',
      },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch image: ${href} (${response.status})`);
      return null;
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/jpeg') && !contentType.startsWith('image/png')) {
      console.warn(`Unsupported image type from URL: ${href} (${contentType})`);
      return null;
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mimeType = contentType.split(';')[0]!;
    const dataUrl = `data:${mimeType};base64,${base64}`;
    const dimensions = getImageDimensions(buffer, mimeType);

    return { id, data: dataUrl, dimensions: dimensions ?? undefined };
  } catch (error) {
    console.warn(`Failed to fetch remote image: ${href}`, error);
    return null;
  }
}

export async function loadImage(
  info: ImageInfo,
  basePath: string
): Promise<ImageData | null> {
  if (isRemoteUrl(info.href)) {
    return loadRemoteImage(info.href, info.id);
  }
  return loadLocalImage(info.href, basePath, info.id);
}

export interface LoadedImages {
  data: Record<string, string>;  // Image ID -> Base64 data URL
  dimensions: Record<string, ImageDimensions>;  // Image ID -> dimensions
}

export async function loadImages(
  images: ImageInfo[],
  basePath: string
): Promise<LoadedImages> {
  const data: Record<string, string> = {};
  const dimensions: Record<string, ImageDimensions> = {};

  const loadedImages = await Promise.all(
    images.map((img) => loadImage(img, basePath))
  );

  for (const img of loadedImages) {
    if (img) {
      data[img.id] = img.data;
      if (img.dimensions) {
        dimensions[img.id] = img.dimensions;
      }
    }
  }

  return { data, dimensions };
}
