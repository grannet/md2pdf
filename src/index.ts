#!/usr/bin/env bun
import { resolve, basename, dirname, extname } from "node:path";
import { existsSync } from "node:fs";
import { convert } from "./converter";
import { isPaperSize, PAPER_SIZES, type PaperSize } from "./config/paper";
import {
  isMarginPreset,
  MARGIN_PRESETS,
  type MarginPreset,
} from "./config/margins";

const VERSION = "1.0.0";

function printHelp() {
  console.log(`
md2pdf - Markdown to PDF converter

Usage:
  md2pdf <input.md> [options]

Options:
  -o, --output <path>    Output PDF path (default: input with .pdf extension)
  -p, --paper <size>     Paper width: A1-A5, B1-B5 (default: A4)
  -m, --margin <preset>  Margin preset: default, dense (default: default)
  -h, --help             Show this help message
  -v, --version          Show version

Paper Sizes (width):
  A1: 594mm, A2: 420mm, A3: 297mm, A4: 210mm, A5: 148mm
  B1: 707mm, B2: 500mm, B3: 353mm, B4: 250mm, B5: 176mm

Margin Presets:
  default: 40pt margins (all sides)
  dense:   20pt margins (all sides)

Examples:
  md2pdf document.md                    # → document.pdf (A4, default margins)
  md2pdf document.md -o output.pdf      # → output.pdf
  md2pdf document.md --paper A3         # → document.pdf (A3 width)
  md2pdf document.md --margin dense     # → document.pdf (dense margins)
`);
}

function printVersion() {
  console.log(`md2pdf v${VERSION}`);
}

function parseArgs(args: string[]): {
  input?: string;
  output?: string;
  paper: PaperSize;
  margin: MarginPreset;
  help: boolean;
  version: boolean;
  error?: string;
} {
  const result: {
    input?: string;
    output?: string;
    paper: PaperSize;
    margin: MarginPreset;
    help: boolean;
    version: boolean;
    error?: string;
  } = {
    paper: "A4",
    margin: "default",
    help: false,
    version: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === "-h" || arg === "--help") {
      result.help = true;
      i++;
      continue;
    }

    if (arg === "-v" || arg === "--version") {
      result.version = true;
      i++;
      continue;
    }

    if (arg === "-o" || arg === "--output") {
      if (i + 1 >= args.length) {
        result.error = "Missing output path after -o/--output";
        return result;
      }
      result.output = args[i + 1];
      i += 2;
      continue;
    }

    if (arg === "-p" || arg === "--paper") {
      if (i + 1 >= args.length) {
        result.error = "Missing paper size after -p/--paper";
        return result;
      }
      const paperArg = args[i + 1];
      if (typeof paperArg !== "string") {
        result.error = "Missing paper size after -p/--paper";
        return result;
      }
      const paperArgUpper = paperArg.toUpperCase();
      if (!isPaperSize(paperArgUpper)) {
        result.error = `Invalid paper size: ${paperArg}. Valid sizes: ${Object.keys(
          PAPER_SIZES
        ).join(", ")}`;
        return result;
      }
      result.paper = paperArg as PaperSize;
      i += 2;
      continue;
    }

    if (arg === "-m" || arg === "--margin") {
      if (i + 1 >= args.length) {
        result.error = "Missing margin preset after -m/--margin";
        return result;
      }
      const marginArgRaw = args[i + 1];
      if (typeof marginArgRaw !== "string") {
        result.error = "Missing margin preset after -m/--margin";
        return result;
      }
      const marginArg = marginArgRaw.toLowerCase();
      if (!isMarginPreset(marginArg)) {
        result.error = `Invalid margin preset: ${marginArgRaw}. Valid presets: ${Object.keys(
          MARGIN_PRESETS
        ).join(", ")}`;
        return result;
      }
      result.margin = marginArg;
      i += 2;
      continue;
    }

    if (arg && arg.startsWith("-")) {
      result.error = `Unknown option: ${arg}`;
      return result;
    }

    // Positional argument (input file)
    if (!result.input) {
      result.input = arg;
    } else {
      result.error = `Unexpected argument: ${arg}`;
      return result;
    }

    i++;
  }

  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const parsed = parseArgs(args);

  if (parsed.error) {
    console.error(`Error: ${parsed.error}`);
    console.error("Run with --help for usage information.");
    process.exit(1);
  }

  if (parsed.help) {
    printHelp();
    process.exit(0);
  }

  if (parsed.version) {
    printVersion();
    process.exit(0);
  }

  if (!parsed.input) {
    console.error("Error: No input file specified.");
    console.error("Run with --help for usage information.");
    process.exit(1);
  }

  const inputPath = resolve(parsed.input);

  if (!existsSync(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  // Default output path: same as input with .pdf extension
  const outputPath = parsed.output
    ? resolve(parsed.output)
    : resolve(
        dirname(inputPath),
        basename(inputPath, extname(inputPath)) + ".pdf"
      );

  try {
    await convert(inputPath, outputPath, {
      paperSize: parsed.paper,
      marginPreset: parsed.margin,
    });
  } catch (error) {
    console.error("Error during conversion:", error);
    process.exit(1);
  }
}

main();
