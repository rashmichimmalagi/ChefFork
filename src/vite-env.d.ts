/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CHEFFORK_HERO_VIDEO_URL?: string;
  readonly VITE_INSFORGE_URL?: string;
  readonly VITE_INSFORGE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
