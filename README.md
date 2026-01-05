# md2pdf

MarkdownをPDFに変換するCLIツール。日本語フォントと画像を自動でサポート。

## 特徴

- **日本語フォント自動検出**: macOS/Windows/Linuxで利用可能なフォントを自動選択
- **画像サポート**: ローカルファイルとリモートURL（PNG/JPEG）
- **用紙サイズ**: A4, A3, Letter, Legal など
- **余白プリセット**: default, dense

## インストール

```bash
bun install
```

## 使い方

```bash
# 基本的な使用方法
bun run start input.md -o output.pdf

# 用紙サイズを指定
bun run start input.md -o output.pdf --paper A3

# 余白プリセットを指定
bun run start input.md -o output.pdf --margin dense
```

## オプション

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| `-o, --output` | 出力ファイルパス | input.pdf |
| `-p, --paper` | 用紙サイズ (A4, A3, Letter, Legal) | A4 |
| `-m, --margin` | 余白プリセット (default, dense) | default |

## ビルド

```bash
# 実行可能ファイルを作成
bun run build

# 実行
./md2pdf input.md -o output.pdf
```

## 対応Markdown記法

- 見出し (h1-h6)
- 段落
- 強調 (**太字**, *斜体*)
- リスト (番号付き、箇条書き)
- コードブロック
- 画像 (`![alt](path)`)
- リンク
- 水平線
- 引用

## 技術スタック

- [Bun](https://bun.sh) - JavaScript/TypeScript ランタイム
- [pdfmake](http://pdfmake.org/) - PDF生成
- [pdf-lib](https://pdf-lib.js.org/) - PDF後処理
- [marked](https://marked.js.org/) - Markdownパーサー
