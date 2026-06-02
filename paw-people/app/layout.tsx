import type { Metadata, Viewport } from 'next'
import './globals.css'
import BottomNav from '@/components/BottomNav'
import SideNav from '@/components/SideNav'
import AuthGate from '@/components/AuthGate'

export const metadata: Metadata = {
  title: 'Paw People',
  description: 'Treatment log platform for Paw People NGO',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-gray-50">
        <AuthGate>
          <div className="md:flex md:min-h-screen">
            <SideNav />
            <main className="flex-1">
              <div className="max-w-lg md:max-w-7xl mx-auto bg-white md:bg-transparent min-h-screen md:py-8">
                {children}
              </div>
            </main>
          </div>
          <BottomNav />
        </AuthGate>
      </body>
    </html>
  )
}
