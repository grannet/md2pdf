import type { Token, Tokens } from '../parser';
import type { Content, RenderContext } from './types';
import { STYLES } from '../config/styles';
import { renderInlineTokens } from './inline';
import {
  isHeadingToken,
  isParagraphToken,
  isListToken,
  isCodeToken,
  isTableToken,
  isBlockquoteToken,
  isHrToken,
  isSpaceToken,
  isImageToken,
} from '../parser';

export function renderBlockToken(token: Token, context: RenderContext): Content | null {
  if (isHeadingToken(token)) {
    return renderHeading(token, context);
  }

  if (isParagraphToken(token)) {
    return renderParagraph(token, context);
  }

  if (isListToken(token)) {
    return renderList(token, context);
  }

  if (isCodeToken(token)) {
    return renderCodeBlock(token, context);
  }

  if (isTableToken(token)) {
    return renderTable(token, context);
  }

  if (isBlockquoteToken(token)) {
    return renderBlockquote(token, context);
  }

  if (isHrToken(token)) {
    return renderHorizontalRule();
  }

  if (isSpaceToken(token)) {
    return null; // Skip space tokens
  }

  if (isImageToken(token)) {
    return renderImage(token, context);
  }

  // Fallback: try to render as paragraph if it has tokens
  if ('tokens' in token && Array.isArray((token as any).tokens)) {
    return {
      text: renderInlineTokens((token as any).tokens, context),
      margin: STYLES.margins.paragraph,
    };
  }

  return null;
}

function renderHeading(token: Tokens.Heading, context: RenderContext): Content {
  const level = Math.min(Math.max(token.depth, 1), 6);
  const fontSize = STYLES.headingSizes[level - 1];

  return {
    text: renderInlineTokens(token.tokens ?? [], context),
    fontSize,
    bold: true,
    color: STYLES.colors.heading,
    margin: STYLES.margins.heading,
  };
}

function renderParagraph(token: Tokens.Paragraph, context: RenderContext): Content {
  // Check if paragraph contains only a single image
  const tokens = token.tokens ?? [];
  if (tokens.length === 1 && isImageToken(tokens[0])) {
    return renderImage(tokens[0] as Tokens.Image, context);
  }

  return {
    text: renderInlineTokens(tokens, context),
    fontSize: STYLES.bodyFontSize,
    lineHeight: STYLES.lineHeight,
    margin: STYLES.margins.paragraph,
  };
}

function renderList(token: Tokens.List, context: RenderContext): Content {
  const items = token.items.map((item) => {
    // Render list item content
    const content: Content[] = [];

    if (item.tokens) {
      for (const t of item.tokens) {
        if (isParagraphToken(t)) {
          // Don't wrap in paragraph for list items
          content.push({
            text: renderInlineTokens(t.tokens ?? [], context),
          });
        } else if (isListToken(t)) {
          // Nested list
          content.push(renderList(t, context));
        } else if ('tokens' in t && Array.isArray((t as any).tokens)) {
          content.push({
            text: renderInlineTokens((t as any).tokens, context),
          });
        }
      }
    }

    // Handle task list items
    if (item.task) {
      const checkbox = item.checked ? '[x] ' : '[ ] ';
      if (content.length > 0 && typeof content[0] === 'object' && 'text' in content[0]) {
        const first = content[0] as any;
        if (typeof first.text === 'string') {
          first.text = checkbox + first.text;
        } else if (Array.isArray(first.text)) {
          first.text = [{ text: checkbox }, ...first.text];
        }
      }
    }

    return content.length === 1 ? content[0] : { stack: content };
  });

  if (token.ordered) {
    return {
      ol: items,
      margin: STYLES.margins.list,
    };
  }

  return {
    ul: items,
    margin: STYLES.margins.list,
  };
}

function renderCodeBlock(token: Tokens.Code, context: RenderContext): Content {
  // Use Japanese font if available, otherwise use Courier
  const codeFont = context.japaneseFont ?? 'Courier';

  return {
    stack: [
      // Language label (if present)
      ...(token.lang
        ? [
            {
              text: token.lang,
              fontSize: 8,
              color: '#586069',
              bold: true,
              margin: [0, 0, 0, 4] as [number, number, number, number],
            },
          ]
        : []),
      // Code content in a table for background
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                text: token.text,
                fontSize: STYLES.codeFontSize,
                font: codeFont,
                color: STYLES.colors.codeText,
                preserveLeadingSpaces: true,
                lineHeight: 1.3,
                margin: [STYLES.codeBlock.padding, STYLES.codeBlock.padding, STYLES.codeBlock.padding, STYLES.codeBlock.padding],
              },
            ],
          ],
        },
        layout: {
          fillColor: () => STYLES.colors.codeBackground,
          hLineColor: () => STYLES.colors.codeBorder,
          vLineColor: () => STYLES.colors.codeBorder,
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
      },
    ],
    margin: STYLES.margins.codeBlock,
  };
}

function renderTable(token: Tokens.Table, context: RenderContext): Content {
  // Build header row
  const headerRow = token.header.map((cell) => ({
    text: renderInlineTokens(cell.tokens ?? [], context),
    bold: STYLES.table.headerBold,
    fillColor: STYLES.colors.tableHeaderBg,
    margin: [STYLES.table.cellPadding, STYLES.table.cellPadding, STYLES.table.cellPadding, STYLES.table.cellPadding] as [number, number, number, number],
    alignment: mapAlignment(cell.align),
  }));

  // Build body rows
  const bodyRows = token.rows.map((row) =>
    row.map((cell) => ({
      text: renderInlineTokens(cell.tokens ?? [], context),
      margin: [STYLES.table.cellPadding, STYLES.table.cellPadding, STYLES.table.cellPadding, STYLES.table.cellPadding] as [number, number, number, number],
      alignment: mapAlignment(cell.align),
    }))
  );

  return {
    table: {
      headerRows: 1,
      widths: token.header.map(() => '*'),
      body: [headerRow, ...bodyRows],
    },
    layout: {
      hLineColor: () => STYLES.colors.tableBorder,
      vLineColor: () => STYLES.colors.tableBorder,
      hLineWidth: () => 1,
      vLineWidth: () => 1,
    },
    margin: STYLES.margins.table,
  };
}

function mapAlignment(align: 'left' | 'right' | 'center' | null): 'left' | 'right' | 'center' {
  return align ?? 'left';
}

function renderBlockquote(token: Tokens.Blockquote, context: RenderContext): Content {
  const content: Content[] = [];

  if (token.tokens) {
    for (const t of token.tokens) {
      const rendered = renderBlockToken(t, context);
      if (rendered) {
        content.push(rendered);
      }
    }
  }

  return {
    stack: [
      {
        columns: [
          {
            width: 4,
            canvas: [
              {
                type: 'rect',
                x: 0,
                y: 0,
                w: 4,
                h: 100, // Will be adjusted by pdfmake
                color: STYLES.colors.blockquoteBorder,
              },
            ],
          },
          {
            width: '*',
            stack: content,
            color: STYLES.colors.blockquoteText,
            margin: [10, 0, 0, 0],
          },
        ],
      },
    ],
    margin: STYLES.margins.blockquote,
  };
}

function renderHorizontalRule(): Content {
  return {
    canvas: [
      {
        type: 'line',
        x1: 0,
        y1: 0,
        x2: 515, // Will be adjusted based on page width
        y2: 0,
        lineWidth: 1,
        lineColor: STYLES.colors.hrColor,
      },
    ],
    margin: [0, 15, 0, 15] as [number, number, number, number],
  };
}

function renderImage(token: Tokens.Image, context: RenderContext): Content {
  const imageId = `img_${context.images.length}`;

  // Collect image info for later loading
  context.images.push({
    id: imageId,
    href: token.href,
    alt: token.text || '',
  });

  // Return pdfmake image content
  // The image data will be provided in the document definition's images object
  return {
    image: imageId,
    fit: [500, 400],  // Fit within page width while preserving aspect ratio
    margin: STYLES.margins.image,
  } as Content;
}
