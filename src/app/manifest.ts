import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Macro Tracker',
    short_name: 'Macros',
    description: 'AI-powered macronutrient tracker',
    start_url: '/',
    display: 'standalone',
    background_color: '#1c1917',
    theme_color: '#c9704a',
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
