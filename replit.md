# FormActive - AI-Powered Conversational Form Builder

## Overview
FormActive is a Next.js 13 application that provides an AI-powered conversational form builder. Users describe their intent (what they want to learn), and AI generates conversational questions with proper input types, validation, and natural transitions. Forms display as a friendly chat experience with customizable themes. Uses Supabase for authentication and database, and Replit AI Integrations for OpenAI access (gpt-4.1).

## Recent Changes
- 2026-02-08: **AI-powered generation** — Users describe intent, AI generates conversation nodes via `/api/ai/generate-node`
- 2026-02-08: **Theme system** — Colors, fonts, backgrounds (solid/gradient/image), bubble styles, logo, custom CSS
- 2026-02-08: **CTA nodes** — Call-to-action buttons with {{variable}} template support for dynamic URLs
- 2026-02-08: **Debug panel** — Toggleable overlay showing AI metadata (field_key, data_type, extraction, validation)
- 2026-02-08: **Transition messages** — Natural text shown before questions for conversational flow
- 2026-02-08: Updated landing page with AI-focused copy and How It Works
- 2026-02-08: Extended ConversationalForm renderer with theme support, transitions, CTAs
- 2026-02-08: Public form page applies theme background styles

## Project Architecture
- **Framework**: Next.js 13.5.1 (App Router)
- **UI**: React 18, Tailwind CSS, Radix UI components (shadcn/ui pattern)
- **Backend**: Supabase (auth, database, RLS policies)
- **AI**: OpenAI gpt-4.1 via Replit AI Integrations (no API key needed)
- **Language**: TypeScript

### Key Directories
- `app/` - Next.js App Router pages and API routes
- `app/api/forms/` - Form CRUD, publish, submissions API routes
- `app/api/ai/` - AI generation endpoints
- `app/dashboard/forms/[id]/` - Single-page form builder with AI generation
- `app/f/[slug]/` - Public conversational form renderer
- `components/` - React components (ui/, auth/, conversational-form)
- `lib/` - Shared utilities (supabase client, auth context, types, openai)
- `hooks/` - Custom React hooks
- `supabase/migrations/` - Database migration SQL files

### Key Files
- `components/conversational-form.tsx` - Reusable conversational chat form UI with theme support
- `lib/types.ts` - TypeScript types (Question, FormConfig, ConversationNode, Theme, CTA, etc.)
- `lib/openai.ts` - OpenAI client initialization (uses Replit AI Integrations)
- `lib/supabase.ts` - Supabase client helpers (createServerClient, getAnonClient)
- `lib/auth-context.tsx` - Auth context provider
- `app/api/ai/generate-node/route.ts` - AI endpoint: intent → conversation node
- `app/dashboard/forms/[id]/page.tsx` - Main form builder (editor + theme + AI + preview)
- `app/f/[slug]/page.tsx` - Public conversational form renderer with theme

### Data Model
- **forms** table: id, user_id, name, slug, status (draft/live), current_config (JSON), published_config (JSON), version, published_at
- **submissions** table: id, form_id, answers (JSON), metadata (JSON), created_at
- **form_versions** table: id, form_id, version_number, config_snapshot (JSON), created_at

### ConversationNode Schema (in current_config.questions)
Each question is a ConversationNode with:
- `intent` - What the form creator wants to learn
- `field_key` - Machine-readable key for the answer
- `data_type` - Expected data type (text, number, email, date, etc.)
- `ui_type` - Question type for rendering (short_text, dropdown, rating, etc.)
- `user_prompt` - The conversational question shown to the user
- `transition_before` - Optional natural text before the question
- `validation` - Rules (required, min/max, pattern, etc.)
- `options` - For dropdown/multi_select/pills types
- `extraction` - AI metadata about what data is being collected
- `followups` - Suggested follow-up intents

### Theme System (in current_config.theme)
- `primaryColor`, `secondaryColor` - Brand colors
- `botBubbleColor`, `botTextColor` - Bot message styling
- `userBubbleColor`, `userTextColor` - User message styling
- `backgroundColor`, `backgroundType` - Solid/gradient/image backgrounds
- `backgroundGradient`, `backgroundImage` - Background values
- `fontFamily` - Custom font
- `bubbleStyle` - rounded or minimal
- `logoUrl` - Brand logo
- `customCss` - Additional CSS overrides

### CTA Nodes
- Question type `cta` renders as a clickable button
- `cta_url` supports `{{field_key}}` template variables resolved from answers
- `cta_label` is the button text

### Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_DB_URL` - Supabase database connection string (for migrations)
- `SUPABASE_DB_PASSWORD` - Supabase database password
- OpenAI key managed automatically by Replit AI Integrations

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
- Bot messages (questions) on left with avatar, user answers on right
- Typing indicator between questions for natural feel
- Transition messages shown as subtle text before questions
- Input area adapts to question type (text, pills, stars, date picker, etc.)
- CTA nodes render as clickable buttons with resolved template variables
- Theme colors, fonts, and styles applied dynamically
- `isPreview` mode auto-plays first 3 questions with sample answers
- `onSubmit` callback for real submissions, omitted for preview mode

### Builder Features
- Intent-first workflow: describe what you want to learn
- Tone selector: friendly, professional, casual, formal
- Directness slider: 1 (very casual) to 5 (very direct)
- Audience field: who is this form for
- "Generate with AI" button per question
- Manual editing of all generated fields
- Theme editor panel (colors, fonts, backgrounds, bubble styles)
- Debug panel toggle showing AI metadata per question
- Live conversational preview on right side

## User Preferences
- No pricing/monetisation features
- Conversational chat-style forms (not classic all-at-once forms)
- App name: FormActive
- Single-page builder approach (no multi-step wizards)
- AI-powered intent-first workflow
