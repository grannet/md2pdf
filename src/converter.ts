import { dirname } from 'node:path';
import { parseMarkdown } from './parser';
import { renderTokens, type RenderContext, type Content } from './renderer';
import { detectFonts } from './fonts/detector';
import { buildFontSystem } from './fonts/loader';
import { loadImages, type ImageInfo } from './images/loader';
import { generatePDF } from './pdf/generator';
import { getPaperSize, type PaperSize } from './config/paper';
import { getPageMargins, type MarginPreset } from './config/margins';
import { STYLES } from './config/styles';

// Replace failed image references with placeholder text
function replaceFailedImages(
  content: Content[],
  loadedImages: Record<string, string>,
  imageInfos: ImageInfo[]
): Content[] {
  const result: Content[] = [];

  for (const item of content) {
    if (item && typeof item === 'object' && 'image' in item) {
      const imageId = (item as any).image;
      if (!loadedImages[imageId]) {
        // Find the original image info for error message
        const info = imageInfos.find((i) => i.id === imageId);
        result.push({
          text: `[Image not found: ${info?.alt || info?.href || imageId}]`,
          italics: true,
          color: '#999999',
          margin: STYLES.margins.image,
        });
      } else {
        result.push(item);
      }
    } else if (item && typeof item === 'object' && 'stack' in item) {
      // Recursively process stacks
      (item as any).stack = replaceFailedImages((item as any).stack, loadedImages, imageInfos);
      result.push(item);
    } else if (item && typeof item === 'object' && 'columns' in item) {
      // Recursively process columns
      (item as any).columns = replaceFailedImages((item as any).columns, loadedImages, imageInfos);
      result.push(item);
    } else {
      result.push(item);
    }
  }

  return result;
}

export interface ConvertOptions {
  paperSize?: PaperSize | string;
  marginPreset?: MarginPreset;
}

export async function convert(
  inputPath: string,
  outputPath: string,
  options: ConvertOptions = {}
): Promise<void> {
  // Read input file
  const inputFile = Bun.file(inputPath);
  const markdown = await inputFile.text();

  // Parse markdown
  const { tokens } = parseMarkdown(markdown);

  // Detect and load fonts (before rendering so we can pass font info to renderer)
  const { japanese, os } = detectFonts();

  if (japanese) {
    console.log(`Using Japanese font: ${japanese.name} (${os})`);
  } else {
    console.log(`No Japanese font found on ${os}, using Helvetica`);
  }

  const fonts = await buildFontSystem(japanese);

  // Set up render context with font info
  const context: RenderContext = {
    basePath: dirname(inputPath),
    japaneseFont: fonts.defaultFont !== 'Helvetica' ? fonts.defaultFont : null,
    images: [],  // Will be populated during rendering
  };

  // Render tokens to pdfmake content
  const content = renderTokens(tokens, context);

  // Load all collected images
  const loadedImages = await loadImages(context.images, context.basePath);
  if (context.images.length > 0) {
    console.log(`Loaded ${Object.keys(loadedImages.data).length}/${context.images.length} images`);
  }

  // Replace failed image references with placeholder text
  const processedContent = replaceFailedImages(content, loadedImages.data, context.images);

  // Get paper dimensions
  const paper = getPaperSize(options.paperSize ?? 'A4');
  console.log(`Paper size: ${paper.name} (${paper.mmWidth}mm width)`);

  // Get page margins
  const pageMargins = getPageMargins(options.marginPreset ?? 'default');
  console.log(`Margin preset: ${options.marginPreset ?? 'default'}`);

  // Generate PDF
  const pdfBuffer = await generatePDF(processedContent, {
    paper,
    fonts,
    pageMargins,
    images: loadedImages.data,
    imageDimensions: loadedImages.dimensions,
  });

  // Write output file
  await Bun.write(outputPath, pdfBuffer);
  console.log(`PDF written to: ${outputPath}`);
}
