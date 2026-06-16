import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'chef-orange': '#ff7c2e',
        'chef-gold': '#ffd700',
        'chef-green': '#44ff88',
        'chef-red': '#ff3344',
        'chef-bg': '#0d0800',
      },
    },
  },
  plugins: [],
};

export default config;
