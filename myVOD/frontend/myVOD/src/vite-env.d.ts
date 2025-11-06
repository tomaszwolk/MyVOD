/// <reference types="vite/client" />

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ImportMetaEnv {
  // add app-specific env vars here if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
