import type { Metadata } from 'next'
import { Saira } from 'next/font/google'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import './globals.css'

// The website's font (BRAND.md Website style). next/font downloads it at build time and serves
// it from our own domain, so browsers never contact Google and the CSP stays font-src 'self'.
const saira = Saira({
  subsets: ['latin'],
  weight: ['400', '600', '800'],
  display: 'swap',
  variable: '--font-saira',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Carbon Offroad Academy',
    template: '%s | Carbon Offroad Academy',
  },
  description:
    'Product training from Carbon Offroad. Short videos on fitting, using and looking after your gear.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en-AU" className={saira.variable}>
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only bg-carbon-cyan px-4 py-3 font-bold text-carbon-black focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
        >
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  )
}
