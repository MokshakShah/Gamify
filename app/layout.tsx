import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Gamify - AI-Powered Study Assistant',
  description:
    'Transform lectures, PDFs, videos, and audio into interactive learning resources with AI-powered summaries, quizzes, flashcards, and smart tutoring.',
  keywords: [
    'AI learning',
    'study assistant',
    'flashcards',
    'quizzes',
    'educational platform',
    'exam preparation',
  ],
  authors: [{ name: 'Gamify' }],
  openGraph: {
    title: 'Gamify - AI-Powered Study Assistant',
    description: 'Learn smarter with AI-powered study tools',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} h-full antialiased`}>
        <body className={inter.variable}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
