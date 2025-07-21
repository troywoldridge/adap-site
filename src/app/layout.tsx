import '@/globals.css'
import Navbar from '@/components/Navbar'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'American Design And Printing | Premium Print & Promo Products',
  description:
    'Discover high-quality custom print, packaging, and promotional products for your business. Fast shipping, unbeatable quality, and expert service.',
  openGraph: {
    title: 'ADAP E-Commerce',
    description:
      'High-quality custom print and promo products for growing brands.',
    url: 'https://www.adapprint.com',
    siteName: 'ADAP E-Commerce',
    images: [
      {
        url: 'https://www.adapprint.com/og-cover.jpg',
        width: 1200,
        height: 630,
        alt: 'ADAP E-Commerce - Custom Print Experts'
      }
    ],
    locale: 'en_US',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    site: '@adapnow',
    creator: '@adapnow',
    title: 'ADAP E-Commerce',
    description:
      'Custom print, promo, and packaging products to power your brand.',
    images: ['https://www.adapprint.com/og-cover.jpg']
  },
  metadataBase: new URL('https://www.adapprint.com')
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#1D4ED8" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://www.adapprint.com/" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
     <body>
  <Header />
  <Navbar />
  
  
 <main>
    {children}
  </main>

  <Footer />
</body>

    </html>
  )
}
