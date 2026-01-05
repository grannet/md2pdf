import { existsSync } from 'node:fs';

export type OSType = 'windows' | 'macos' | 'linux' | 'unknown';

export interface FontFamily {
  name: string;
  normal: string;
  bold?: string;
  italics?: string;
  bolditalics?: string;
}

export function detectOS(): OSType {
  const platform = process.platform;
  if (platform === 'win32') return 'windows';
  if (platform === 'darwin') return 'macos';
  if (platform === 'linux') return 'linux';
  return 'unknown';
}

// Japanese font candidates by OS
// TTC fonts are supported via fontkit extraction
const FONT_CANDIDATES: Record<OSType, { name: string; paths: string[] }[]> = {
  windows: [
    {
      name: 'YuGothic',
      paths: [
        'C:\\Windows\\Fonts\\YuGothR.ttf',
        'C:\\Windows\\Fonts\\yugothic.ttf',
      ],
    },
    {
      name: 'Meiryo',
      paths: [
        'C:\\Windows\\Fonts\\meiryo.ttf',
      ],
    },
    {
      name: 'MSGothic',
      paths: [
        'C:\\Windows\\Fonts\\msgothic.ttf',
      ],
    },
  ],
  macos: [
    // 1. ヒラギノ角ゴシック (TTC format) - macOS built-in
    {
      name: 'HiraginoKakuGothic',
      paths: [
        '/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc',
        '/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc',
      ],
    },
    // 2. BIZ UD Gothic - Japanese font (TTF format, user-installed)
    {
      name: 'BIZUDPGothic',
      paths: [
        `${process.env.HOME}/Library/Fonts/BIZUDPGothic-Regular.ttf`,
        '/Library/Fonts/BIZUDPGothic-Regular.ttf',
      ],
    },
  ],
  linux: [
    {
      name: 'NotoSansCJKJP',
      paths: [
        '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
        '/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc',
        '/usr/share/fonts/google-noto-cjk/NotoSansCJK-Regular.ttc',
        '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
        '/usr/share/fonts/OTF/NotoSansCJK-Regular.ttc',
      ],
    },
    {
      name: 'IPAGothic',
      paths: [
        '/usr/share/fonts/ipa-gothic/ipag.ttf',
        '/usr/share/fonts/truetype/ipa-gothic/ipag.ttf',
        '/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf',
      ],
    },
  ],
  unknown: [],
};

export function findJapaneseFont(os: OSType): FontFamily | null {
  const candidates = FONT_CANDIDATES[os] || [];

  for (const candidate of candidates) {
    for (const fontPath of candidate.paths) {
      if (existsSync(fontPath)) {
        return {
          name: candidate.name,
          normal: fontPath,
          bold: fontPath,
          italics: fontPath,
          bolditalics: fontPath,
        };
      }
    }
  }

  return null;
}

export function detectFonts(): { japanese: FontFamily | null; os: OSType } {
  const os = detectOS();
  const japanese = findJapaneseFont(os);

  return { japanese, os };
}
