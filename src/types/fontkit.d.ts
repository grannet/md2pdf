declare module 'fontkit' {
  interface Font {
    postscriptName: string | null;
  }

  interface FontCollection {
    fonts: Font[];
  }

  export function openSync(path: string): Font | FontCollection;
}
