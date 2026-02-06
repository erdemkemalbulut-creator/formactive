# FormFlow - Conversational Forms SaaS

A complete full-stack SaaS application for creating and publishing intelligent conversational forms powered by AI.

## Features

### Core Functionality
- **User Authentication** - Secure email/password authentication with Supabase
- **Form Builder** - Create forms with three customizable sections:
  - Conversation rules to guide AI behavior
  - Business information for context
  - Data fields to collect (with types and validation)
- **Public Forms** - Each form gets a unique shareable URL
- **AI Conversations** - Natural chat interface that asks questions one at a time
- **Data Extraction** - Automatically structures responses into your defined fields
- **Results Dashboard** - View all responses in a table with conversation history
- **CSV Export** - Download all form responses for analysis

### Technical Features
- Built with Next.js 13 (App Router)
- Supabase for database and authentication
- OpenAI integration for conversational AI
- Fully responsive design
- Row-level security for data isolation
- Real-time progress indicators
- Mobile-friendly chat interface

## Getting Started

### Prerequisites
- Node.js 18+ installed
- A Supabase account (already configured)
- OpenAI API key (for AI conversations)

### Installation

1. The project is already set up with dependencies installed

2. Configure your OpenAI API key in `.env`:
```bash
OPENAI_API_KEY=your_actual_openai_api_key
```

3. The database is already set up with all necessary tables and security policies

### Running the Application

The development server starts automatically. Access the application at:
- **Homepage/Login**: http://localhost:3000
- **Dashboard**: http://localhost:3000/dashboard

## Usage Guide

### 1. Create an Account
- Visit the homepage
- Click "Don't have an account? Sign up"
- Enter your email and password

### 2. Create Your First Form
- Click "Create New Form" from the dashboard
- Your form comes pre-populated with helpful defaults to get you started
- Configure your form in four tabs:

**Settings Tab:**
- Set your form name
- Toggle publish status
- Copy the public URL

**Conversation Rules Tab:**
- Pre-filled with a friendly template you can customize
- Define how the AI should behave
- Set the tone and style
- Helpful tips provided inline to guide you

**Business Info Tab:**
- Comes with example entries you can modify or remove
- Add context about your business
- Key-value pairs (e.g., Company Name: Acme Corp)
- Helpful examples show what to include

**Data Fields Tab:**
- Starts with common fields: Full Name, Email, Message
- Add, remove, or modify fields as needed
- Choose field types: text, email, phone, number, date
- Mark fields as required or optional
- Inline guidance explains how fields work

### 3. Publish and Share
- Toggle "Publish Form" in Settings
- Copy the form URL
- Share with your audience

### 4. View Results
- Click "Results" from the form editor
- View all completed conversations
- Click "View Chat" to see full transcripts
- Export to CSV for analysis

## Project Structure

```
/app
  /api
    /chat              # AI conversation endpoint
  /dashboard           # Main dashboard
    /forms/[id]        # Form builder
    /forms/[id]/results # Results viewer
  /f/[slug]           # Public form interface
/components
  /auth               # Login/signup forms
  /ui                 # Reusable UI components
/lib
  auth-context.tsx    # Authentication provider
  supabase.ts         # Database client
```

## Database Schema

The application uses 5 main tables:
- **forms** - Form configurations and settings
- **conversations** - Individual form submission sessions
- **messages** - Chat messages in each conversation
- **responses** - Extracted structured data

All tables have Row Level Security (RLS) enabled for data isolation.

## API Routes

### POST /api/chat
Handles AI conversation logic:
- Processes user messages
- Generates AI responses
- Extracts structured data
- Determines conversation completion

## AI Configuration

The application uses OpenAI's GPT-4 for conversations. You can customize:
- Model selection (in `/app/api/chat/route.ts`)
- Temperature and creativity settings
- System prompt structure
- Data extraction logic

## Security Features

- Email/password authentication
- Row Level Security (RLS) on all tables
- Server-side API key storage
- Tenant isolation
- Input validation
- CSRF protection

## Deployment

The application is deployment-ready for:
- Netlify (netlify.toml included)
- Vercel
- Any Node.js hosting platform

Environment variables needed:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`

## Support

For questions or issues:
- Check the code comments
- Review the database migration file
- Test with the OpenAI API key configured

## License

This is a production-ready MVP for a conversational forms SaaS application.
