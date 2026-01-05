// Paper size definitions (width in points, 1mm = 2.83465pt)
const mm = (v: number) => Math.round(v * 2.83465);

export type PaperSize = 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'B1' | 'B2' | 'B3' | 'B4' | 'B5';

export interface PaperDimensions {
  width: number;  // in points
  name: string;
  mmWidth: number;
}

export const PAPER_SIZES: Record<PaperSize, PaperDimensions> = {
  A1: { width: mm(594), name: 'A1', mmWidth: 594 },
  A2: { width: mm(420), name: 'A2', mmWidth: 420 },
  A3: { width: mm(297), name: 'A3', mmWidth: 297 },
  A4: { width: mm(210), name: 'A4', mmWidth: 210 },
  A5: { width: mm(148), name: 'A5', mmWidth: 148 },
  B1: { width: mm(707), name: 'B1', mmWidth: 707 },
  B2: { width: mm(500), name: 'B2', mmWidth: 500 },
  B3: { width: mm(353), name: 'B3', mmWidth: 353 },
  B4: { width: mm(250), name: 'B4', mmWidth: 250 },
  B5: { width: mm(176), name: 'B5', mmWidth: 176 },
};

// Maximum page height (10000mm) for single-page infinite scroll
export const MAX_PAGE_HEIGHT = mm(10000);

export const DEFAULT_PAPER_SIZE: PaperSize = 'A4';

export function isPaperSize(value: string): value is PaperSize {
  return value.toUpperCase() in PAPER_SIZES;
}

export function getPaperSize(value: string): PaperDimensions {
  const normalized = value.toUpperCase() as PaperSize;
  return PAPER_SIZES[normalized] ?? PAPER_SIZES[DEFAULT_PAPER_SIZE];
}
