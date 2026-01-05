import { marked, type Token, type Tokens } from 'marked';

// Configure marked for GFM (GitHub Flavored Markdown)
marked.use({
  gfm: true,
  breaks: false,
});

export type { Token, Tokens };

export interface ParseResult {
  tokens: Token[];
}

export function parseMarkdown(markdown: string): ParseResult {
  const tokens = marked.lexer(markdown);
  return { tokens };
}

// Type guards for token types
export function isHeadingToken(token: Token): token is Tokens.Heading {
  return token.type === 'heading';
}

export function isParagraphToken(token: Token): token is Tokens.Paragraph {
  return token.type === 'paragraph';
}

export function isListToken(token: Token): token is Tokens.List {
  return token.type === 'list';
}

export function isCodeToken(token: Token): token is Tokens.Code {
  return token.type === 'code';
}

export function isTableToken(token: Token): token is Tokens.Table {
  return token.type === 'table';
}

export function isBlockquoteToken(token: Token): token is Tokens.Blockquote {
  return token.type === 'blockquote';
}

export function isHrToken(token: Token): token is Tokens.Hr {
  return token.type === 'hr';
}

export function isSpaceToken(token: Token): token is Tokens.Space {
  return token.type === 'space';
}

export function isImageToken(token: Token): token is Tokens.Image {
  return token.type === 'image';
}

export function isHtmlToken(token: Token): token is Tokens.HTML {
  return token.type === 'html';
}

// Inline token type guards
export function isTextToken(token: Token): token is Tokens.Text {
  return token.type === 'text';
}

export function isStrongToken(token: Token): token is Tokens.Strong {
  return token.type === 'strong';
}

export function isEmToken(token: Token): token is Tokens.Em {
  return token.type === 'em';
}

export function isDelToken(token: Token): token is Tokens.Del {
  return token.type === 'del';
}

export function isLinkToken(token: Token): token is Tokens.Link {
  return token.type === 'link';
}

export function isCodespanToken(token: Token): token is Tokens.Codespan {
  return token.type === 'codespan';
}

export function isBrToken(token: Token): token is Tokens.Br {
  return token.type === 'br';
}

export function isEscapeToken(token: Token): token is Tokens.Escape {
  return token.type === 'escape';
}
