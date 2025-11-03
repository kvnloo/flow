import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { ThemeProvider } from '@/providers/theme-provider';
import { AudioProvider } from '@/providers/audio-provider';
import './globals.css';

/**
 * Metadata configuration for the Flow app
 */
export const metadata: Metadata = {
  title: {
    default: 'Flow - EEG Neurofeedback Training',
    template: '%s | Flow',
  },
  description:
    'Real-time EEG neurofeedback training system with Muse 2 integration. Train your brain for optimal flow states with binaural beats, ambient soundscapes, and visual feedback.',
  keywords: [
    'EEG',
    'neurofeedback',
    'flow state',
    'meditation',
    'brain training',
    'Muse 2',
    'binaural beats',
    'brainwave entrainment',
    'cognitive enhancement',
    'peak performance',
  ],
  authors: [{ name: 'Flow Team' }],
  creator: 'Flow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://flow.app',
    title: 'Flow - EEG Neurofeedback Training',
    description: 'Train your brain for optimal flow states with real-time EEG feedback',
    siteName: 'Flow',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Flow - EEG Neurofeedback Training',
    description: 'Train your brain for optimal flow states with real-time EEG feedback',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

/**
 * Viewport configuration for responsive design
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

/**
 * Root layout component for Next.js App Router
 *
 * Features:
 * - Geist font family (sans and mono variants)
 * - Dark mode support via next-themes
 * - Global audio context provider
 * - Responsive viewport configuration
 * - SEO-optimized metadata
 * - Semantic HTML structure
 *
 * @param children - Page content to render
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AudioProvider>
            <div className="relative min-h-screen bg-background">
              {children}
            </div>
          </AudioProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
