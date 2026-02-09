# FormActive - AI-Powered Conversational Form Builder

## Overview
FormActive is a Next.js 13 application that provides an AI-powered conversational form builder. Users describe their full situation in natural language (e.g., "I'm organizing my wedding and want to know who will attend, which dates work, and meal preferences"), and AI generates a complete conversational form with proper question types and natural wording. Forms display as a friendly chat experience with customizable themes. Uses Supabase for authentication and database, and Replit AI Integrations for OpenAI access (gpt-4.1).

## Recent Changes
- 2026-02-09: **Two-step AI system** — Step 1: Structure prompt generates question plan (label/type/required/options), Step 2: Wording prompt generates conversational message per question
- 2026-02-09: **Simplified question types** — 9 types: short_text, long_text, single_choice, multiple_choice, yes_no, date, number, email, phone (plus CTA)
- 2026-02-09: **Simplified data model** — Questions now have: label, message, type, required, options, key (removed data_type, extraction, validation, transition_before, followups)
- 2026-02-09: **Per-question wording regenerate** — Each question has a "Generate" button for conversational wording
- 2026-02-09: **AIContext simplified** — context, tone, audience (removed directness)
- 2026-02-08: **Theme system** — Colors, fonts, backgrounds (solid/gradient/image), bubble styles, logo, custom CSS
- 2026-02-08: **CTA nodes** — Call-to-action buttons with {{variable}} template support for dynamic URLs

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
- `lib/types.ts` - TypeScript types (Question, FormConfig, AIContext, Theme, CTA, etc.)
- `lib/openai.ts` - OpenAI client initialization (uses Replit AI Integrations)
- `lib/supabase.ts` - Supabase client helpers (createServerClient, getAnonClient)
- `lib/auth-context.tsx` - Auth context provider
- `app/api/ai/generate-conversation/route.ts` - AI endpoint: context → JSON array of question structure (label/type/required/options)
- `app/api/ai/generate-node/route.ts` - AI endpoint: journey item → conversational message text
- `app/dashboard/forms/[id]/page.tsx` - Main form builder (editor + theme + AI + preview)
- `app/f/[slug]/page.tsx` - Public conversational form renderer with theme

### Data Model
- **forms** table: id, user_id, name, slug, status (draft/live), current_config (JSON), published_config (JSON), version, published_at
- **submissions** table: id, form_id, answers (JSON), metadata (JSON), created_at
- **form_versions** table: id, form_id, version_number, config_snapshot (JSON), created_at

### Question Schema (in current_config.questions)
Each question has:
- `id` - Unique identifier
- `key` - Machine-readable key for storing answers (auto-generated from label)
- `type` - One of: short_text, long_text, single_choice, multiple_choice, yes_no, date, number, email, phone, cta
- `label` - What this question asks (the intent/description)
- `message` - AI-generated conversational wording shown to the respondent
- `required` - Whether the question is mandatory
- `options` - For single_choice/multiple_choice types
- `order` - Display order
- `cta` - For CTA type: { text, url, openInNewTab }

### Theme System (in current_config.theme)
- `primaryColor`, `secondaryColor` - Brand colors
- `botBubbleColor` - Bot message styling
- `userBubbleColor` - User message styling
- `backgroundColor`, `backgroundType` - Solid/gradient/image backgrounds
- `backgroundGradient`, `backgroundImage` - Background values
- `fontFamily` - Custom font
- `bubbleStyle` - rounded or minimal
- `logoUrl` - Brand logo
- `customCss` - Additional CSS overrides

### AI System (Two-Step with Validation)
1. **Structure Generation** (`/api/ai/generate-conversation`):
   - Input: context description, tone, audience
   - Output: JSON array of `{ label, type, required, options }`
   - Prompt focuses on conversation design, not survey design
   
2. **Wording Generation** (`/api/ai/generate-node`):
   - Input: global description, tone, full journey list, current item
   - Two-pass pipeline:
     a. **Generate**: Creates candidate message text (temperature 0.7)
     b. **Validate**: Strict validator checks message against rules (temperature 0) — ensures it speaks only to respondent, contains one step, no meta/AI references, matches tone. Returns `{ok, reason, fixed_message}`. If invalid, the fixed_message replaces the candidate.
   - Output: validated plain text message for the respondent

### CTA Nodes
- Question type `cta` renders as a clickable button
- `cta.url` supports `{{field_key}}` template variables resolved from answers
- `cta.text` is the button text

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
- Uses `message` field for conversational wording, falls back to `label`
- Typing indicator between questions for natural feel
- Input area adapts to question type (text, pills, date picker, etc.)
- CTA nodes render as clickable buttons with resolved template variables
- Theme colors, fonts, and styles applied dynamically
- `isPreview` mode auto-plays first 3 questions with sample answers
- `onSubmit` callback for real submissions, omitted for preview mode

### Builder Features
- Context-first workflow: describe your full situation (unlimited scenarios)
- AI Context panel with context textarea, tone, audience
- "Generate Full Conversation" button creates structure then auto-generates wording
- Journey list shows all questions with green dot indicator for generated wording
- Per-question "Generate" button for conversational wording
- Manual editing of label, message, type, key, options
- Theme editor panel (colors, fonts, backgrounds, bubble styles)
- Live conversational preview on right side

## User Preferences
- No pricing/monetisation features
- Conversational chat-style forms (not classic all-at-once forms)
- App name: FormActive
- Single-page builder approach (no multi-step wizards)
- AI-powered context-first workflow
- Two-step AI: structure first, then wording
