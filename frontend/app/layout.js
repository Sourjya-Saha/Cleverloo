// app/layout.js
import './globals.css';
import { Poppins } from 'next/font/google';
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from '@vercel/speed-insights/next';
import NextAuthSessionProvider from './provider';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata = {
  title: 'Clever Loo - Smart Restroom System',
  description: 'Clever Loo lets you book and manage restroom queues online. Avoid waiting and find the nearest clean public restroom with ease.',
  keywords: ['Clever Loo', 'Public Restroom', 'Smart Toilet', 'Online Booking', 'Bioaxar'],
  robots: 'index, follow',
  authors: [{ name: 'Bioaxar' }],
  creator: 'Bioaxar',
  openGraph: {
    title: 'Clever Loo - Smart Restroom Queue System',
    description: 'Find a clean public restroom or manage your restroom facility with ease.',
    url: 'https://cleverloo.vercel.app',
    siteName: 'Clever Loo',
    images: [
      {
        url: '/cleverloo.png',
        width: 512,
        height: 512,
        alt: 'Clever Loo Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  metadataBase: new URL('https://cleverloo.vercel.app'),
  themeColor: '#87bc43',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Required for PWA install and iOS Add to Home Screen */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#87bc43" />
        <link rel="apple-touch-icon" href="/Clever Loo LOGO - 3.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Clever Loo" />
      </head>
      <body className={`${poppins.className} bg-[#026738]`}>
        <NextAuthSessionProvider>
          {children}
        </NextAuthSessionProvider>

        {/* Global Toast notifications for entire app */}
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          toastClassName="custom-toast"
          progressClassName="custom-progress"
          style={{ zIndex: 1000 }}
        />

        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
