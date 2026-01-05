import { openSync } from 'fontkit';
import type { FontFamily } from './detector';
import type { TFontDictionary } from 'pdfmake/interfaces';

export interface LoadedFonts {
  vfs: Record<string, string>;
  fonts: TFontDictionary;
  defaultFont: string;
}

// Check if path is a TTC (TrueType Collection) file
function isTTCFile(path: string): boolean {
  return path.toLowerCase().endsWith('.ttc');
}

// Get PostScript name from TTC file (for pdfkit font selection)
function getTTCPostScriptName(fontPath: string): string | null {
  try {
    const font = openSync(fontPath);
    if ('fonts' in font && Array.isArray(font.fonts) && font.fonts.length > 0) {
      return font.fonts[0].postscriptName || null;
    }
  } catch {
    return null;
  }
  return null;
}

export async function buildFontSystem(japaneseFont: FontFamily | null): Promise<LoadedFonts> {
  const vfs: Record<string, string> = {};
  const fonts: TFontDictionary = {};

  // Load Japanese font if available
  if (japaneseFont && japaneseFont.normal) {
    try {
      // Verify the font file exists
      const file = Bun.file(japaneseFont.normal);
      const exists = await file.exists();

      if (exists) {
        // Read font file directly (works for TTF, OTF, and TTC)
        const fontBuffer = Buffer.from(await file.arrayBuffer());
        const fontKey = `${japaneseFont.name}.ttf`;

        // Register font in VFS as base64
        vfs[fontKey] = fontBuffer.toString('base64');

        // For TTC files, get PostScript name for font selection
        const isTTC = isTTCFile(japaneseFont.normal);
        const postScriptName = isTTC ? getTTCPostScriptName(japaneseFont.normal) : null;

        // Register font with pdfmake
        // For TTC: use [fontKey, postScriptName] array to select specific font
        // For TTF/OTF: use just fontKey
        const fontDef = postScriptName ? [fontKey, postScriptName] : fontKey;

        fonts[japaneseFont.name] = {
          normal: fontDef,
          bold: fontDef,
          italics: fontDef,
          bolditalics: fontDef,
        };

        console.log(`Loaded font: ${japaneseFont.name}${postScriptName ? ` (PostScript: ${postScriptName})` : ''}`);

        return {
          vfs,
          fonts,
          defaultFont: japaneseFont.name,
        };
      }
    } catch (error) {
      console.warn(`Warning: Failed to load Japanese font ${japaneseFont.name}: ${error}`);
    }
  }

  // Fallback to Helvetica (built-in standard font - no VFS needed)
  return {
    vfs,
    fonts,
    defaultFont: 'Helvetica',
  };
}
