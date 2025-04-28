import { Toaster } from '@/components/ui/sonner';
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Controle Financeiro',
  description: 'Aplicativo para gerenciar finanças pessoais',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR"  suppressHydrationWarning  >
      <body className={inter.className}>
        <ThemeProvider  attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            >{children}   <Toaster richColors />
        </ThemeProvider></body>
    </html>
  );
}