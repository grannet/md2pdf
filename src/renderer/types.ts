import type { Content, ContentText, ContentColumns, ContentStack, ContentTable, ContentCanvas, ContentImage } from 'pdfmake/interfaces';

// Re-export pdfmake types for convenience
export type { Content, ContentText, ContentColumns, ContentStack, ContentTable, ContentCanvas, ContentImage };

// Image information collected during rendering
export interface ImageInfo {
  id: string;
  href: string;
  alt: string;
}

// Text with styling
export interface StyledText {
  text: string | StyledText[];
  bold?: boolean;
  italics?: boolean;
  decoration?: 'underline' | 'lineThrough';
  color?: string;
  background?: string;
  fontSize?: number;
  font?: string;
  link?: string;
  preserveLeadingSpaces?: boolean;
}

// Inline content (text with possible styling)
export type InlineContent = string | StyledText | StyledText[];

// Block-level content
export type BlockContent = Content;

// Renderer context for passing state
export interface RenderContext {
  basePath: string;  // Base path for resolving relative image paths
  japaneseFont: string | null;  // Japanese font name for code blocks (null if not available)
  images: ImageInfo[];  // Collected image information during rendering
}
