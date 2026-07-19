import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin', 'cyrillic'], variable: '--font-sans' })
const cormorant = Cormorant_Garamond({
  subsets: ['latin', 'cyrillic'],
  weight: ['500', '600', '700'],
  variable: '--font-serif',
})

export const metadata: Metadata = {
  title: 'Летопись Эрдалиона — эволюционная симуляция',
  description:
    'Самообучающаяся симуляция мира: 10 враждующих народов, войны, дипломатия, торговля и династические браки. Каждая фракция учится на собственном опыте.',
}

export const viewport: Viewport = {
  themeColor: '#1c1916',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className={`bg-background ${geist.variable} ${cormorant.variable}`}>
      <body className="antialiased font-sans">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
