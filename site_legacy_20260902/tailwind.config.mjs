/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				"primary": "#FF6347", // Tomato Red
				"secondary": "#4CAF50", // Fresh Green
				"accent": "#FFD700", // Gold/Mustard
				"background-light": "#f8f8f5",
				"background-dark": "#050505",
				"surface-light": "#ffffff",
				"surface-dark": "#121212",
				"surface-highlight": "#1e1e1e",
				"text-light": "#181811",
				"text-dark": "#ededed",
				"text-muted": "#a1a1aa",
				"neutral-border": "#e6e6db",
				"neutral-border-dark": "#44433a",
			},
			fontFamily: {
				"display": ["Patrick Hand", "cursive"],
				"sans": ["Open Sans", "sans-serif"],
				"mono": ["Space Mono", "monospace"],
			},
			boxShadow: {
				"neon": "0 0 15px rgba(255, 99, 71, 0.4)",
				"neon-hover": "0 0 30px rgba(255, 99, 71, 0.6)",
				"neon-purple": "0 0 20px rgba(76, 175, 80, 0.3)",
			}
		},
	},
	plugins: [
		require('@tailwindcss/forms'),
		require('@tailwindcss/container-queries'),
	],
}
