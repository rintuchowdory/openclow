import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Openclow — AI Assistant',
  description: 'Chat with Hugging Face, Gemini, or OpenAI and organize your tasks in one workspace.',
  icons: { icon: '/logo.svg' },
}
export const viewport: Viewport = { width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="antialiased">{children}</body></html>
}
