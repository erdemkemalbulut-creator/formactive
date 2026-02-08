# FormFlow - Conversational Forms

## Overview
FormFlow is a Next.js 13 application that creates intelligent conversational forms for businesses. It replaces long booking forms with natural conversations to collect trip details, preferences, and requirements. Uses Supabase for authentication and database, with optional OpenAI integration for AI-powered responses.

## Recent Changes
- 2026-02-08: Copy update — made wizard copy travel-industry universal (trips, groups, events, weddings, etc.); "client" → "guest", "intake" → "request", neutral greetings in ChatPreview
- 2026-02-08: UX overhaul of "Create New Form" wizard — split-pane layout for Steps 2 & 3 with live ChatPreview, inline validation, tone card accessibility, scroll-to-top on step change
- 2026-02-06: Removed all pricing, billing, subscription, and monetisation pages/components/references
- 2026-02-06: Initial Replit setup - configured port 5000, added graceful Supabase fallback for missing env vars

## Project Architecture
- **Framework**: Next.js 13.5.1 (App Router)
- **UI**: React 18, Tailwind CSS, Radix UI components (shadcn/ui pattern)
- **Backend**: Supabase (auth, database, RLS policies)
- **Language**: TypeScript

### Key Directories
- `app/` - Next.js App Router pages and API routes
- `components/` - React components (ui/, auth/, chat-preview.tsx)
- `lib/` - Shared utilities (supabase client, auth context)
- `hooks/` - Custom React hooks
- `supabase/migrations/` - Database migration SQL files

### Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-only)
- `OPENAI_API_KEY` - Optional, for AI-powered responses

### Running
- Dev: `npm run dev` (runs on port 5000)
- Build: `npm run build`
- Start: `npm run start` (runs on port 5000)

## User Preferences
- No pricing/monetisation features desired
