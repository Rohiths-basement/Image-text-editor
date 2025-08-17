import { NextResponse } from 'next/server';
import { GoogleFontsResponse } from '@/editor/types';

export async function GET() {
  try {
    const apiKey = process.env.GOOGLE_FONTS_API_KEY;
    
    if (!apiKey) {
      // Return fallback fonts if no API key
      return NextResponse.json({
        items: [
          { family: 'Inter', variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'], subsets: ['latin'], category: 'sans-serif' },
          { family: 'Roboto', variants: ['100', '300', '400', '500', '700', '900'], subsets: ['latin'], category: 'sans-serif' },
          { family: 'Open Sans', variants: ['300', '400', '500', '600', '700', '800'], subsets: ['latin'], category: 'sans-serif' },
          { family: 'Lato', variants: ['100', '300', '400', '700', '900'], subsets: ['latin'], category: 'sans-serif' },
          { family: 'Montserrat', variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'], subsets: ['latin'], category: 'sans-serif' },
          { family: 'Source Sans Pro', variants: ['200', '300', '400', '600', '700', '900'], subsets: ['latin'], category: 'sans-serif' },
          { family: 'Oswald', variants: ['200', '300', '400', '500', '600', '700'], subsets: ['latin'], category: 'sans-serif' },
          { family: 'Raleway', variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'], subsets: ['latin'], category: 'sans-serif' },
          { family: 'PT Sans', variants: ['400', '700'], subsets: ['latin'], category: 'sans-serif' },
          { family: 'Lora', variants: ['400', '500', '600', '700'], subsets: ['latin'], category: 'serif' },
          { family: 'Merriweather', variants: ['300', '400', '700', '900'], subsets: ['latin'], category: 'serif' },
          { family: 'Playfair Display', variants: ['400', '500', '600', '700', '800', '900'], subsets: ['latin'], category: 'serif' },
          { family: 'Source Code Pro', variants: ['200', '300', '400', '500', '600', '700', '800', '900'], subsets: ['latin'], category: 'monospace' },
          { family: 'Fira Code', variants: ['300', '400', '500', '600', '700'], subsets: ['latin'], category: 'monospace' },
          { family: 'JetBrains Mono', variants: ['100', '200', '300', '400', '500', '600', '700', '800'], subsets: ['latin'], category: 'monospace' },
        ]
      });
    }

    const response = await fetch(
      `https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}&sort=popularity`,
      {
        // Avoid putting large payloads (>2MB) into Next.js data cache in dev
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch fonts from Google Fonts API');
    }

    const data: GoogleFontsResponse = await response.json();
    
    // Filter and limit fonts for better performance
    const filteredFonts = data.items
      .filter(font => font.subsets.includes('latin'))
      .slice(0, 120) // Limit to top 120 fonts to reduce payload size
      .map(font => ({
        family: font.family,
        variants: font.variants,
        subsets: font.subsets,
        category: font.category,
      }));

    return NextResponse.json({ items: filteredFonts });
  } catch (error) {
    console.error('Error fetching Google Fonts:', error);
    
    // Return fallback fonts on error
    return NextResponse.json({
      items: [
        { family: 'Inter', variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'], subsets: ['latin'], category: 'sans-serif' },
        { family: 'Arial', variants: ['400', '700'], subsets: ['latin'], category: 'sans-serif' },
        { family: 'Helvetica', variants: ['400', '700'], subsets: ['latin'], category: 'sans-serif' },
        { family: 'Times New Roman', variants: ['400', '700'], subsets: ['latin'], category: 'serif' },
        { family: 'Georgia', variants: ['400', '700'], subsets: ['latin'], category: 'serif' },
        { family: 'Courier New', variants: ['400', '700'], subsets: ['latin'], category: 'monospace' },
      ]
    });
  }
}
