import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { NotificationProvider } from '@/lib/notification-context';
import { SessionProvider } from '@/lib/session-context';
import { PrinterProvider } from '@/lib/printer-context';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'LNXS - ナイトワーク特化POSシステム',
  description: 'ナイトワーク業界に特化した次世代POSシステム。注文管理から給与計算まで一元管理。',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <NotificationProvider>
          <SessionProvider>
            <PrinterProvider>
            {children}
            <Toaster />
            </PrinterProvider>
          </SessionProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}
