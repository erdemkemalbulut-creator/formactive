# FormActive - Conversational Form Builder

## Overview
FormActive is a Next.js 13 application that provides a conversational form builder with live preview. Users create forms with predefined questions using a single-page editor, see a real-time conversational preview, and publish. Public forms display as a chat-style conversation — one question at a time with message bubbles. Uses Supabase for authentication and database. No AI — the conversation is structured with 14 question types.

## Recent Changes
- 2026-02-08: **Conversational UI** — Public forms and builder preview now use chat-style conversation (one question at a time, message bubbles, typing indicator)
- 2026-02-08: New `components/conversational-form.tsx` — Reusable chat UI component used in both public form and builder preview
- 2026-02-08: Updated landing page with conversational hero mockup and updated copy
- 2026-02-08: Added `/setup` page for database migration guidance
- 2026-02-08: Refactored API routes to use authenticated Supabase client (no service role key needed)
- 2026-02-08: **Major rebuild** — Single-page form builder with left editor + right live preview
- 2026-02-08: New API routes: POST /api/forms, GET/PATCH /api/forms/[id], POST /api/forms/[id]/publish, GET/POST /api/forms/[id]/submissions
- 2026-02-08: Publish/republish workflow with version snapshots and dirty detection
- 2026-02-08: Submissions page with table view, expandable rows, and CSV export

## Project Architecture
- **Framework**: Next.js 13.5.1 (App Router)
- **UI**: React 18, Tailwind CSS, Radix UI components (shadcn/ui pattern)
- **Backend**: Supabase (auth, database, RLS policies)
- **Language**: TypeScript

### Key Directories
- `app/` - Next.js App Router pages and API routes
- `app/api/forms/` - Form CRUD, publish, submissions API routes
- `app/dashboard/forms/[id]/` - Single-page form builder
- `app/f/[slug]/` - Public conversational form renderer
- `components/` - React components (ui/, auth/, conversational-form)
- `lib/` - Shared utilities (supabase client, auth context, types)
- `hooks/` - Custom React hooks
- `supabase/migrations/` - Database migration SQL files

### Key Files
- `components/conversational-form.tsx` - Reusable conversational chat form UI (used in public form + builder preview)
- `lib/types.ts` - Shared TypeScript types (Question, FormConfig, QuestionType, etc.)
- `lib/supabase.ts` - Supabase client helpers (createServerClient, getAnonClient)
- `lib/auth-context.tsx` - Auth context provider
- `app/dashboard/forms/[id]/page.tsx` - Main form builder (editor + conversational preview)
- `app/f/[slug]/page.tsx` - Public conversational form renderer

### Data Model
- **forms** table: id, user_id, name, slug, status (draft/live), current_config (JSON), published_config (JSON), version, published_at
- **submissions** table: id, form_id, answers (JSON), metadata (JSON), created_at
- **form_versions** table: id, form_id, version_number, config_snapshot (JSON), created_at
- Legacy tables still exist: conversations, messages, responses, subscriptions

### Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_DB_URL` - Supabase database connection string (for migrations)
- `SUPABASE_DB_PASSWORD` - Supabase database password

### Running
- Dev: `npm run dev` (runs on port 5000)
- Build: `npm run build`
- Start: `npm run start` (runs on port 5000)

### Publishing Model
- Forms have `current_config` (editing state) and `published_config` (live state)
- "Publish" copies current_config → published_config, sets status to 'live', creates version snapshot
- "Republish" when current_config differs from published_config after editing a live form
- Public URL: /f/:slug serves published_config as conversational chat

### Conversational Form Component
- `ConversationalForm` component renders questions one at a time in chat bubbles
- Bot messages (questions) on left with avatar, user answers on right in blue bubbles
- Typing indicator between questions for natural feel
- Input area adapts to question type (text, pills, stars, date picker, etc.)
- `isPreview` mode auto-plays first 3 questions with sample answers
- `onSubmit` callback for real submissions, omitted for preview mode

## User Preferences
- No pricing/monetisation features
- Conversational chat-style forms (not classic all-at-once forms)
- App name: FormActive
- Single-page builder approach (no multi-step wizards)
