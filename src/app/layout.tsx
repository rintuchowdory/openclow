import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'openclow - Your Personal AI Assistant',
  description: 'Free AI-powered assistant for homework, tasks, and study',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
