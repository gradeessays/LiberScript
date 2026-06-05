import type { Config } from 'tailwindcss';
import preset from '@liberscript/ui/tailwind-preset';

const config: Config = {
  presets: [preset],
  content: [
    './src/**/*.{ts,tsx}',
    // Scan the shared UI package so its component classes are included.
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
};

export default config;
