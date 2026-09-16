import { createClient } from '@insforge/sdk';

const FALLBACK_URL = 'https://did2k7x3.ap-southeast.insforge.app';
const FALLBACK_ANON_KEY = 'anon_5e199785af310220e12de9e1fe85e559e45ee6f16b5c2a09eece8236d0d77755';

export const insforge = createClient({
  baseUrl: (import.meta as any).env?.VITE_INSFORGE_URL || FALLBACK_URL,
  anonKey: (import.meta as any).env?.VITE_INSFORGE_ANON_KEY || FALLBACK_ANON_KEY,
});
