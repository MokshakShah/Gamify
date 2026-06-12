# Gamify - AI-Powered Study Assistant

A modern web application that transforms lectures, PDFs, videos, and audio content into interactive learning resources using artificial intelligence. Built with Next.js and TypeScript for optimal performance and developer experience.

## Overview

Gamify helps students and professionals enhance their learning experience by converting various content formats into AI-powered summaries, quizzes, flashcards, and interactive tutoring sessions. The platform integrates multiple AI services to provide comprehensive study assistance.

## Features

- **Multi-Format Content Processing**: Upload and process PDFs, videos, and audio files
- **AI-Powered Summaries**: Generate intelligent summaries from various content types
- **Interactive Quizzes**: Create custom quizzes based on your study materials
- **Smart Flashcards**: Generate flashcards for efficient memorization
- **YouTube Integration**: Extract and summarize content from YouTube videos
- **Gamified Learning**: Track progress with daily visit rewards and achievements
- **User Authentication**: Secure authentication system with Clerk
- **Modern UI**: Responsive design with dark/light theme support

## Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Authentication**: Clerk
- **Database**: Supabase with Prisma ORM
- **AI Integration**: Groq SDK, OpenAI
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **Animations**: Framer Motion
- **Form Handling**: React Hook Form with Zod validation

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm, yarn, pnpm, or bun package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd gamify
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env.local
```

4. Configure your environment variables in `.env.local`:
   - Clerk authentication keys
   - Supabase database URL and service role key
   - AI service API keys (Groq, Gemini)

5. Run database migrations:
```bash
npx prisma generate
npx prisma db push
```

### Development

Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   ├── sign-in/           # Authentication pages
│   └── sign-up/
├── components/            # React components
│   ├── dashboard/         # Dashboard-specific components
│   ├── landing/           # Landing page components
│   ├── rewards/           # Gamification components
│   └── ui/                # Reusable UI components
├── lib/                   # Utility libraries
│   ├── auth/              # Authentication utilities
│   ├── chat/              # Chat functionality
│   ├── groq/              # Groq AI integration
│   ├── pdf/               # PDF processing
│   ├── supabase/          # Database client
│   └── youtube/           # YouTube integration
└── supabase/              # Database migrations
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary. All rights reserved.

## Support

For support and questions, please contact the development team or create an issue in the repository.
