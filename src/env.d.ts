interface ImportMeta {
  readonly env: { readonly DEV: boolean };
}

declare module "*?worker&url" {
  const url: string;
  export default url;
}
