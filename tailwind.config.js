import tailwindConfig from '@hypothesis/frontend-shared/lib/tailwind.preset.js';

export default {
  presets: [tailwindConfig],
  content: [
    './src/components/**/*.{js,ts,tsx}',
    './node_modules/@hypothesis/frontend-shared/lib/**/*.{js,ts,tsx}',
  ],
};
