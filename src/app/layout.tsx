import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Openclow ULTRA - AI Assistant Portfolio',
  description: 'A beautiful, modern AI chat application powered by HuggingFace, Gemini, and OpenAI. Free, fast, and production-ready.',
  keywords: ['AI', 'Chat', 'Assistant', 'HuggingFace', 'Gemini', 'OpenAI', 'Next.js'],
  authors: [{ name: 'Openclow Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='75' font-size='75' fill='%234f46e5'>C</text></svg>" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
