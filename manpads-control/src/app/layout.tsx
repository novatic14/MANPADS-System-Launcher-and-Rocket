import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/ThemeProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'MANPADS Control Panel',
  description: 'Professional-grade desktop control panel for rocket & launcher management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Circular:wght@400;500&family=Source+Code+Pro:wght@400&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="min-h-screen bg-background">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}