import type { Token, Tokens } from '../parser';
import type { StyledText, InlineContent, RenderContext } from './types';
import { STYLES } from '../config/styles';
import {
  isTextToken,
  isStrongToken,
  isEmToken,
  isDelToken,
  isLinkToken,
  isCodespanToken,
  isBrToken,
  isEscapeToken,
} from '../parser';

export function renderInlineTokens(tokens: Token[], context?: RenderContext): InlineContent {
  if (!tokens || tokens.length === 0) {
    return '';
  }

  const result: StyledText[] = [];

  for (const token of tokens) {
    const rendered = renderInlineToken(token, context);
    if (rendered !== null) {
      if (typeof rendered === 'string') {
        result.push({ text: rendered });
      } else if (Array.isArray(rendered)) {
        result.push(...rendered);
      } else {
        result.push(rendered);
      }
    }
  }

  return result.length === 1 ? result[0] : result;
}

function renderInlineToken(token: Token, context?: RenderContext): StyledText | StyledText[] | string | null {
  if (isTextToken(token)) {
    return token.text;
  }

  if (isStrongToken(token)) {
    const inner = renderInlineTokens(token.tokens ?? [], context);
    return applyStyle(inner, { bold: true });
  }

  if (isEmToken(token)) {
    const inner = renderInlineTokens(token.tokens ?? [], context);
    return applyStyle(inner, { italics: true });
  }

  if (isDelToken(token)) {
    const inner = renderInlineTokens(token.tokens ?? [], context);
    return applyStyle(inner, { decoration: 'lineThrough' });
  }

  if (isLinkToken(token)) {
    const inner = renderInlineTokens(token.tokens ?? [], context);
    return applyStyle(inner, {
      color: STYLES.colors.link,
      decoration: 'underline',
      link: token.href,
    });
  }

  if (isCodespanToken(token)) {
    // Use Japanese font if available, otherwise use Courier
    const codeFont = context?.japaneseFont ?? 'Courier';
    return {
      text: token.text,
      background: STYLES.colors.codeBackground,
      fontSize: STYLES.codeFontSize,
      font: codeFont,
      preserveLeadingSpaces: true,
    };
  }

  if (isBrToken(token)) {
    return '\n';
  }

  if (isEscapeToken(token)) {
    return token.text;
  }

  // Handle nested tokens if present
  if ('tokens' in token && Array.isArray((token as any).tokens)) {
    return renderInlineTokens((token as any).tokens, context);
  }

  // Fallback: try to extract raw text
  if ('raw' in token) {
    return (token as any).raw;
  }

  return null;
}

function applyStyle(
  content: InlineContent,
  style: Partial<StyledText>
): StyledText | StyledText[] {
  if (typeof content === 'string') {
    return { text: content, ...style };
  }

  if (Array.isArray(content)) {
    return content.map((item) => {
      if (typeof item === 'string') {
        return { text: item, ...style };
      }
      return { ...item, ...style };
    });
  }

  return { ...content, ...style };
}

// Helper to flatten inline content to plain text (for table cells, etc.)
export function flattenToText(content: InlineContent): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content.map(flattenToText).join('');
  }

  if (typeof content.text === 'string') {
    return content.text;
  }

  if (Array.isArray(content.text)) {
    return content.text.map(flattenToText).join('');
  }

  return '';
}
