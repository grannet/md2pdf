# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
bun install              # Install dependencies
bun run start <file.md>  # Run directly from source
bun run build            # Compile to single executable (./md2pdf)
bun run build:all        # Cross-platform builds (Linux/macOS/Windows)
bun run typecheck        # TypeScript type checking (tsc --noEmit)
```

## Architecture

The codebase converts Markdown to PDF with a pipeline architecture:

```
Markdown → Parser (marked) → Renderer → PDF Generator (pdfmake) → Post-processor (pdf-lib)
```

### Core Pipeline (`src/converter.ts`)

1. **Parse**: `marked.lexer()` tokenizes Markdown into AST
2. **Render**: Tokens converted to pdfmake content definitions
3. **Font Setup**: OS-specific Japanese font detection and loading
4. **Image Loading**: Local/remote images loaded as base64 data URLs
5. **Generate PDF**: pdfmake creates initial PDF with max page height
6. **Resize**: pdf-lib shrinks page to actual content height (single-page output)

### Key Design Decisions

**Single-Page PDF**: The generator uses a two-pass approach - first pass measures content height with MAX_PAGE_HEIGHT (10000mm), second pass generates PDF, then pdf-lib resizes the page to actual content height. This avoids pagination.

**Font Handling**: TTC (TrueType Collection) fonts are supported via fontkit extraction. The `fonts/loader.ts` extracts PostScript names from TTC files for pdfmake font selection.

**Image Dimensions**: Image dimensions are parsed directly from PNG/JPEG headers (`images/loader.ts`) to calculate accurate content height for page sizing.

### Module Structure

- `src/parser.ts` - marked configuration and type guards for tokens
- `src/renderer/` - Token-to-pdfmake-content conversion
  - `block.ts` - Block-level elements (headings, code, tables, lists, images)
  - `inline.ts` - Inline elements (bold, italic, links, code spans)
  - `types.ts` - RenderContext and content type definitions
- `src/fonts/` - OS font detection and loading
  - `detector.ts` - Platform-specific Japanese font paths
  - `loader.ts` - TTC extraction and pdfmake font registration
- `src/images/loader.ts` - Local/remote image loading with dimension extraction
- `src/pdf/generator.ts` - pdfmake document creation and pdf-lib resizing
- `src/config/` - Paper sizes, margins, and style definitions

### Rendering Context

`RenderContext` passes state through the rendering pipeline:
- `basePath`: For resolving relative image paths
- `japaneseFont`: Font name for code blocks (falls back to Courier)
- `images`: Collected ImageInfo during rendering (loaded after render pass)

### Style System

All visual styling is centralized in `src/config/styles.ts`:
- Heading sizes, body/code font sizes
- Margins for all block elements
- Colors for text, code, links, tables, blockquotes
