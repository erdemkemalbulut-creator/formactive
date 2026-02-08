# FormActive - Single-Page Form Builder

## Overview
FormActive is a Next.js 13 application that provides an all-in-one form builder with live preview. Users create forms with predefined questions, see a real-time preview, and publish — all from a single page. Uses Supabase for authentication and database. No AI-driven conversations — the form is a classic structured form with 14 question types.

## Recent Changes
- 2026-02-08: **Major rebuild** — Replaced multi-step wizard + conversational AI approach with a single-page form builder (Formless-inspired layout)
- 2026-02-08: New single-page builder at /dashboard/forms/[id] with left editor panels + right live preview
- 2026-02-08: New API routes: POST /api/forms, GET/PATCH /api/forms/[id], POST /api/forms/[id]/publish, GET/POST /api/forms/[id]/submissions
- 2026-02-08: Publish/republish workflow with version snapshots and dirty detection
- 2026-02-08: Public form renderer at /f/:slug renders published forms as classic forms (not chat)
- 2026-02-08: Submissions page with table view, expandable rows, and CSV export
- 2026-02-08: Updated dashboard — "New form" creates via API and redirects to builder, submission counts
- 2026-02-08: Updated landing page copy to match form builder concept
- 2026-02-08: Removed old wizard, chat preview, conversation pages/APIs
- 2026-02-08: New database migration for published_config, form_versions, submissions tables
- 2026-02-08: Shared types in lib/types.ts (Question, FormConfig, QuestionType, etc.)

## Project Architecture
- **Framework**: Next.js 13.5.1 (App Router)
- **UI**: React 18, Tailwind CSS, Radix UI components (shadcn/ui pattern)
- **Backend**: Supabase (auth, database, RLS policies)
- **Language**: TypeScript

### Key Directories
- `app/` - Next.js App Router pages and API routes
- `app/api/forms/` - Form CRUD, publish, submissions API routes
- `app/dashboard/forms/[id]/` - Single-page form builder
- `app/f/[slug]/` - Public form renderer
- `components/` - React components (ui/, auth/)
- `lib/` - Shared utilities (supabase client, auth context, types)
- `hooks/` - Custom React hooks
- `supabase/migrations/` - Database migration SQL files

### Key Files
- `lib/types.ts` - Shared TypeScript types (Question, FormConfig, QuestionType, etc.)
- `lib/supabase.ts` - Supabase client + getServiceClient()
- `lib/auth-context.tsx` - Auth context provider
- `app/dashboard/forms/[id]/page.tsx` - Main form builder (editor + live preview)
- `app/f/[slug]/page.tsx` - Public form renderer

### Data Model
- **forms** table: id, user_id, name, slug, status (draft/live), current_config (JSON), published_config (JSON), version, published_at
- **submissions** table: id, form_id, answers (JSON), metadata (JSON), created_at
- **form_versions** table: id, form_id, version_number, config_snapshot (JSON), created_at
- Legacy tables still exist: conversations, messages, responses, subscriptions

### Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` (or `SERVICE_ROLE_KEY`) - Supabase service role key (server-only)
- `OPENAI_API_KEY` - Optional, for future AI suggestions feature

### Running
- Dev: `npm run dev` (runs on port 5000)
- Build: `npm run build`
- Start: `npm run start` (runs on port 5000)

### Publishing Model
- Forms have `current_config` (editing state) and `published_config` (live state)
- "Publish" copies current_config → published_config, sets status to 'live', creates version snapshot
- "Republish" when current_config differs from published_config after editing a live form
- Public URL: /f/:slug serves published_config only

## User Preferences
- No pricing/monetisation features
- No AI-driven conversations — forms are classic with predefined questions
- App name: FormActive
- Single-page builder approach (no multi-step wizards)
