/** Vite (and so Vitest) imports any file as a string with `?raw`. */
declare module '*?raw' {
  const content: string;
  export default content;
}
