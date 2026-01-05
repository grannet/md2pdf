import pdfmake from 'pdfmake';
import { PDFDocument } from 'pdf-lib';
import type { TDocumentDefinitions, TFontDictionary } from 'pdfmake/interfaces';
import type { Content } from '../renderer/types';
import type { PaperDimensions } from '../config/paper';
import { MAX_PAGE_HEIGHT } from '../config/paper';
import { STYLES } from '../config/styles';
import type { LoadedFonts } from '../fonts/loader';

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface GeneratorOptions {
  paper: PaperDimensions;
  fonts: LoadedFonts;
  pageMargins: [number, number, number, number];
  images: Record<string, string>;  // Image ID -> Base64 data URL
  imageDimensions: Record<string, ImageDimensions>;  // Image ID -> dimensions
}

// Image fit constraints used in renderer (must match block.ts)
const IMAGE_FIT_WIDTH = 500;
const IMAGE_FIT_HEIGHT = 400;

// Calculate rendered height for an image given fit constraints
function calculateImageHeight(dimensions: ImageDimensions): number {
  const { width, height } = dimensions;
  const aspectRatio = width / height;

  // pdfmake fit: scales to fit within box while preserving aspect ratio
  const fitAspect = IMAGE_FIT_WIDTH / IMAGE_FIT_HEIGHT;

  if (aspectRatio > fitAspect) {
    // Image is wider - width constrained
    return IMAGE_FIT_WIDTH / aspectRatio;
  } else {
    // Image is taller - height constrained
    return Math.min(height, IMAGE_FIT_HEIGHT);
  }
}

// Calculate per-image heights (returns map of imageId -> rendered height including margins)
function calculateImageHeights(
  content: Content[],
  imageDimensions: Record<string, ImageDimensions>
): Record<string, number> {
  const heights: Record<string, number> = {};

  function processContent(items: Content[]) {
    for (const item of items) {
      if (item && typeof item === 'object') {
        if ('image' in item) {
          const imageId = (item as any).image;
          const dims = imageDimensions[imageId];
          if (dims) {
            const renderedHeight = calculateImageHeight(dims);
            // Add image margins (top + bottom)
            const totalHeight = renderedHeight + STYLES.margins.image[1] + STYLES.margins.image[3];
            heights[imageId] = totalHeight;
          }
        }
        if ('stack' in item) {
          processContent((item as any).stack);
        }
        if ('columns' in item) {
          processContent((item as any).columns);
        }
      }
    }
  }

  processContent(content);
  return heights;
}

// Create a deep copy of font definitions to avoid mutation issues
function deepCopyFonts(fonts: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(fonts)) {
    if (typeof value === 'object' && value !== null) {
      result[key] = {};
      for (const [k, v] of Object.entries(value)) {
        // Deep copy arrays (for TTC [path, postscriptName] format)
        result[key][k] = Array.isArray(v) ? [...v] : v;
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Set up fonts for pdfmake
function setupFonts(fonts: LoadedFonts): void {
  // Set up VFS for custom fonts (TTC extracted fonts)
  if (Object.keys(fonts.vfs).length > 0) {
    const vfs = (pdfmake as any).virtualfs;
    if (vfs) {
      for (const [filename, data] of Object.entries(fonts.vfs)) {
        vfs.writeFileSync(filename, Buffer.from(data, 'base64'));
      }
    }
  }

  // Set up font definitions - combine built-in with custom fonts
  // Use deep copy to avoid pdfmake's URL resolver mutating our font arrays
  const allFonts = deepCopyFonts({
    Courier: {
      normal: 'Courier',
      bold: 'Courier-Bold',
      italics: 'Courier-Oblique',
      bolditalics: 'Courier-BoldOblique',
    },
    Helvetica: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italics: 'Helvetica-Oblique',
      bolditalics: 'Helvetica-BoldOblique',
    },
    Times: {
      normal: 'Times-Roman',
      bold: 'Times-Bold',
      italics: 'Times-Italic',
      bolditalics: 'Times-BoldItalic',
    },
    Symbol: {
      normal: 'Symbol',
    },
    ZapfDingbats: {
      normal: 'ZapfDingbats',
    },
    // Deep copy custom fonts to avoid mutation
    ...deepCopyFonts(fonts.fonts),
  });

  (pdfmake as any).fonts = allFonts;
}

// Create base document definition
function createDocDefinition(
  content: Content[],
  width: number,
  height: number,
  defaultFont: string,
  pageMargins: [number, number, number, number],
  images: Record<string, string>
): TDocumentDefinitions {
  return {
    pageSize: { width, height },
    pageMargins,
    images,
    defaultStyle: {
      font: defaultFont,
      fontSize: STYLES.bodyFontSize,
      lineHeight: STYLES.lineHeight,
      color: STYLES.colors.text,
    },
    content,
  };
}

interface MeasurementResult {
  maxY: number;
  measuredImageHeights: Record<string, number>;  // Actually stores image top positions
}

// Measure content height using first pass rendering
async function measureContentHeight(
  content: Content[],
  width: number,
  defaultFont: string,
  fonts: LoadedFonts,
  pageMargins: [number, number, number, number],
  images: Record<string, string>
): Promise<MeasurementResult> {
  let maxY = 0;
  let pageCount = 0;
  const pageHeightUsable = MAX_PAGE_HEIGHT - pageMargins[1] - pageMargins[3];
  const measuredImageHeights: Record<string, number> = {};

  const measureDoc: TDocumentDefinitions = {
    ...createDocDefinition(content, width, MAX_PAGE_HEIGHT, defaultFont, pageMargins, images),
    pageBreakBefore: (currentNode: any) => {
      // Track page count from node's page number
      if (currentNode.startPosition && currentNode.startPosition.pageNumber > pageCount) {
        pageCount = currentNode.startPosition.pageNumber;
      }

      // Track image positions for height calculation
      if (currentNode.image) {
        // pdfmake doesn't report image height in callback, but we can use position
        const imageTop = currentNode.startPosition?.top || 0;
        measuredImageHeights[currentNode.image] = imageTop;  // Store top position for analysis
      }

      // Track the maximum Y position, accounting for multiple pages
      if (currentNode.startPosition) {
        const pageOffset = (currentNode.startPosition.pageNumber - 1) * pageHeightUsable;
        const nodeBottom = pageOffset + currentNode.startPosition.top + (currentNode.height || 0);
        maxY = Math.max(maxY, nodeBottom);
      }
      // Never insert page breaks during measurement
      return false;
    },
  };

  // Setup fonts before each PDF creation (pdfmake mutates font definitions)
  setupFonts(fonts);
  const measurePdf = (pdfmake as any).createPdf(measureDoc);
  await measurePdf.getBuffer();

  return { maxY, measuredImageHeights };
}

export async function generatePDF(
  content: Content[],
  options: GeneratorOptions
): Promise<Buffer> {
  const { paper, fonts, pageMargins, images, imageDimensions } = options;

  // Pass 1: Measure content height and track image heights
  const measurement = await measureContentHeight(
    content,
    paper.width,
    fonts.defaultFont,
    fonts,
    pageMargins,
    images
  );

  // Calculate per-image heights based on actual dimensions
  const imageHeights = calculateImageHeights(content, imageDimensions);
  const totalImageHeight = Object.values(imageHeights).reduce((a, b) => a + b, 0);

  // Get image top positions from measurement (imageId -> top position)
  const imagePositions = measurement.measuredImageHeights;  // Actually stores top positions
  const hasImagePositions = Object.keys(imagePositions).length > 0;

  // Determine content height
  let contentHeight: number;
  let imageHeightCorrection = 0;

  if (hasImagePositions && totalImageHeight > 0) {
    // Calculate expected bottom for each image and find the maximum
    let maxExpectedBottom = 0;
    for (const [imageId, topPosition] of Object.entries(imagePositions)) {
      const imageHeight = imageHeights[imageId] || 0;
      const expectedBottom = topPosition + imageHeight;
      maxExpectedBottom = Math.max(maxExpectedBottom, expectedBottom);
    }

    // If maxY doesn't account for the full image extent, add correction
    if (measurement.maxY < maxExpectedBottom) {
      imageHeightCorrection = maxExpectedBottom - measurement.maxY;
    }
    contentHeight = measurement.maxY + imageHeightCorrection;
  } else if (totalImageHeight > 0) {
    // Fallback: no position info, use empirical correction
    imageHeightCorrection = totalImageHeight * 0.22;
    contentHeight = measurement.maxY + imageHeightCorrection;
  } else {
    // No images, use measured height directly
    contentHeight = measurement.maxY;
  }

  // Calculate final page height
  // Note: measureContentHeight returns positions including top margin offset from pdfmake,
  // so we need extra bottom padding to balance visual margins
  const [, topMargin, , bottomMargin] = pageMargins;
  const bottomPadding = 25; // Adjustment to balance top/bottom visual margins
  const targetHeight = topMargin + contentHeight + bottomMargin + bottomPadding;

  console.log(`Content height: ${Math.round(contentHeight)}pt, Page height: ${Math.round(targetHeight)}pt`);

  // Pass 2: Generate PDF with maximum height (ensures no page breaks)
  const docDefinition = createDocDefinition(
    content,
    paper.width,
    MAX_PAGE_HEIGHT,
    fonts.defaultFont,
    pageMargins,
    images
  );

  // Setup fonts again before second PDF creation (pdfmake mutates font definitions)
  setupFonts(fonts);
  const pdf = (pdfmake as any).createPdf(docDefinition);
  const pdfBuffer = await pdf.getBuffer();

  // Pass 3: Resize the page to match content height using pdf-lib
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();

  if (pages.length > 0) {
    const firstPage = pages[0]!;
    const { width } = firstPage.getSize();

    // Set the page height to match content
    firstPage.setSize(width, targetHeight);

    // Adjust the content position (content is at top, so we shift it)
    // pdf-lib uses bottom-left origin, so we need to translate content
    firstPage.translateContent(0, targetHeight - MAX_PAGE_HEIGHT);
  }

  // Remove any additional pages (should be only 1)
  while (pdfDoc.getPageCount() > 1) {
    pdfDoc.removePage(1);
  }

  const resizedPdfBytes = await pdfDoc.save();
  return Buffer.from(resizedPdfBytes);
}
