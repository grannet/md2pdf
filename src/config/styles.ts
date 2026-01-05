// Default styling configuration for PDF output

export const STYLES = {
  // Font sizes for headings (h1-h6)
  headingSizes: [32, 28, 24, 20, 18, 16] as const,

  // Body text
  bodyFontSize: 12,
  codeFontSize: 10,
  lineHeight: 1.4,

  // Margins [left, top, right, bottom] in points
  margins: {
    page: [40, 40, 40, 40] as [number, number, number, number],
    paragraph: [0, 5, 0, 5] as [number, number, number, number],
    heading: [0, 20, 0, 10] as [number, number, number, number],
    codeBlock: [0, 10, 0, 10] as [number, number, number, number],
    list: [0, 5, 0, 5] as [number, number, number, number],
    listItem: [20, 2, 0, 2] as [number, number, number, number],
    blockquote: [20, 5, 20, 5] as [number, number, number, number],
    table: [0, 10, 0, 10] as [number, number, number, number],
    image: [0, 10, 0, 10] as [number, number, number, number],
  },

  // Colors
  colors: {
    text: '#333333',
    heading: '#000000',
    link: '#0066cc',
    codeText: '#333333',
    codeBackground: '#f6f8fa',
    codeBorder: '#e1e4e8',
    blockquoteBorder: '#dfe2e5',
    blockquoteText: '#6a737d',
    tableBorder: '#dfe2e5',
    tableHeaderBg: '#f6f8fa',
    hrColor: '#e1e4e8',
  },

  // Code block styling
  codeBlock: {
    padding: 10,
    borderRadius: 6,
  },

  // Table styling
  table: {
    headerBold: true,
    cellPadding: 8,
  },
} as const;

export type Styles = typeof STYLES;
