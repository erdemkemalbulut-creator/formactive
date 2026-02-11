# FormActive - AI-Powered Conversational Form Builder

## Overview
FormActive is a Next.js 13 application that provides an AI-powered conversational form builder. Users describe their situation in natural language, and AI generates a complete conversational form with appropriate question types and natural wording. Forms are displayed as a Formless-style single-step progressive disclosure experience with customizable themes. The project aims to offer a streamlined, AI-driven form creation process, focusing on user-friendly conversational interfaces.

## User Preferences
- Internal-only product — no pricing, billing, upgrades, profile pages, or commercial surfaces
- Conversational chat-style forms (not classic all-at-once forms)
- App name: formactive (lowercase text logo, no icon)
- Brand: bold, modern, rounded feel, clean typography, lots of whitespace
- Single-page builder approach (no multi-step wizards)
- AI-powered context-first workflow
- Two-step AI: structure first, then wording
- Formless-style UX: builder on left, live preview on right
- Auth flow: Landing (/) → Sign in (/signin) → Dashboard (/dashboard) → Sign out → Landing (/)

## System Architecture
FormActive is built on **Next.js 13.5.1 (App Router)** using **React 18** for the UI, styled with **Tailwind CSS** and **Radix UI components (shadcn/ui pattern)**. The backend leverages **Supabase** for authentication, database management, and RLS policies. AI capabilities are powered by **OpenAI gpt-4.1** via Replit AI Integrations. The entire application is developed in **TypeScript**.

**UI/UX Decisions:**
- **Formless-style single-step progressive disclosure:** The respondent experience focuses on one question at a time, with a progress bar and no message history.
- **Formless-style builder redesign:** A split layout features an ordered builder section on the left and a live preview with visual backgrounds on the right.
- **Theming System:** Customizable `primaryColor`, `fontFamily` (Inter/System/Serif), and `cardStyle` (light/dark) are available. Visual backgrounds (images/videos) can be applied per-step or globally.
- **Cross-dissolve visual transitions:** Smooth cross-fade background transitions between steps and opacity + translateY animations for foreground content.
- **Inert preview inputs:** All preview inputs are disabled/readOnly to clearly differentiate from live forms.
- **Settings Dialog:** A header-level Settings button opens a modal dialog with General (title, colors, font, text size, branding, close form), Advanced (placeholders for share/access/domain), and Tracking (analytics toggles) tabs. FormSettings type stored in FormConfig.settings.
- **Accordion Builder:** The left panel is structured into numbered, collapsible accordion sections for form configuration (e.g., Overview, Tone of voice, Welcome & End screens, Journey, Visuals, About you, Train AI).

**Technical Implementations:**
- **ConversationalForm Component:** A reusable React component (`conversational-form.tsx`) handles the rendering of the single-step conversational UI, dynamic input types, and theme application. It supports a `isPreview` mode for builder integration.
- **Per-step settings:** A settings drawer allows configuration of individual journey items, including required toggle, question type selection (Open ended, Multiple choice, Statement, File upload), YouTube video URL, and internal name.
- **Dynamic Visuals:** Public forms dynamically resolve active visuals per phase/step (welcome, questions, end).
- **CTA Nodes:** `cta` type questions render as clickable buttons supporting `{{variable}}` template resolution from answers for dynamic URLs.
- **Form Configuration:** A comprehensive `FormConfig` object stores all form settings, including `questions`, `welcomeEnabled`, `endEnabled`, `theme`, `aiContext`, and `visuals`.
- **Data Model:**
    - `forms` table: Stores form metadata, `current_config` (editing state), and `published_config` (live state).
    - `submissions` table: Records form answers and metadata.
    - `form_versions` table: Snapshots of form configurations for versioning.
    - `form_events` table: Analytics events (views, starts, step_reached, completions, submissions). Schema: `id`, `form_id`, `event_type`, `session_id`, `step_id`, `step_type`, `step_index`, `device_type`, `duration_ms`, `created_at`. RLS: anon insert, owner-only select.

**Analytics v1:**
- **Event types tracked:** `form_view`, `form_start`, `step_reached`, `form_complete`, `form_submit`.
- **Client-side tracker:** `lib/analytics.ts` — deduplicates events per session, detects device type, tracks elapsed time. Uses `sessionStorage` for session IDs.
- **Preview filtering:** Analytics events are only fired from the public form page (`app/f/[slug]/page.tsx`). The builder preview (`isPreview=true`) never calls `trackEvent`.
- **API routes:** `POST /api/forms/[id]/events` (public, anon insert), `GET /api/forms/[id]/analytics` (auth required, returns aggregated metrics).
- **Dashboard:** `components/analytics-dashboard.tsx` — shows Views, Starts, Completion rate, Avg time to complete, Drop-off by step bar chart, Device breakdown. Gracefully handles empty state and missing table.
- **Migration SQL:** `supabase/migrations/20260209_create_form_events.sql` — must be run manually in Supabase SQL Editor.

**AI System (Two-Step with Validation):**
1.  **Structure Generation:** An AI endpoint (`/api/ai/generate-conversation`) takes a context description and generates a JSON array of question structures (`label`, `type`, `required`, `options`).
2.  **Wording Generation:** Another AI endpoint (`/api/ai/generate-node`) generates and validates conversational wording for individual journey items. It uses a two-pass pipeline:
    -   **Generate:** Creates candidate message text.
    -   **Validate:** Strictly checks the message against rules (e.g., speaks only to respondent, contains one step, no meta/AI references) and fixes it if necessary.

## External Dependencies
- **Supabase**: Used for user authentication, database (PostgreSQL), and file storage (`form-visuals` bucket for images/videos).
- **OpenAI**: Specifically `gpt-4.1`, accessed via Replit AI Integrations for natural language processing and form generation.
- **Next.js**: The core React framework for server-side rendering and API routes.
- **React**: JavaScript library for building user interfaces.
- **Tailwind CSS**: Utility-first CSS framework for styling.
- **Radix UI**: Unstyled component primitives used via the `shadcn/ui` pattern.