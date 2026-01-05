// Margin presets for PDF output

export type MarginPreset = 'default' | 'dense';

// Margins in points [left, top, right, bottom]
export const MARGIN_PRESETS: Record<MarginPreset, [number, number, number, number]> = {
  default: [40, 40, 40, 40],
  dense: [20, 20, 20, 20],
};

export function isMarginPreset(value: string): value is MarginPreset {
  return value in MARGIN_PRESETS;
}

export function getPageMargins(preset: MarginPreset = 'default'): [number, number, number, number] {
  return MARGIN_PRESETS[preset];
}
