/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SPOTIFY_CLIENT_ID: string;
  // Add more env variables here if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
