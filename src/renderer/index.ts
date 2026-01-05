import type { Token } from '../parser';
import type { Content, RenderContext } from './types';
import { renderBlockToken } from './block';

export { renderInlineTokens } from './inline';
export { renderBlockToken } from './block';
export type { Content, RenderContext, StyledText, InlineContent } from './types';

export function renderTokens(tokens: Token[], context: RenderContext): Content[] {
  const content: Content[] = [];

  for (const token of tokens) {
    const rendered = renderBlockToken(token, context);
    if (rendered !== null) {
      content.push(rendered);
    }
  }

  return content;
}
