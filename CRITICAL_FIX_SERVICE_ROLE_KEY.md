# CRITICAL FIX: Service Role Key Required

## Problem Identified

The 403 error on `/rest/v1/conversations?select=*` was caused by **API routes using the anon key instead of the service role key**.

When server-side API routes use the anon key, Supabase enforces RLS policies. Since anon users don't have permission to insert into `conversations` or `messages` tables, all requests fail with 403.

## Changes Made

### 1. Updated API Routes to Use Service Role Key

**Files Changed:**
- `/app/api/conversations/start/route.ts`
- `/app/api/chat/route.ts`

**Before:**
```typescript
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  // ❌ Wrong - enforces RLS
);
```

**After:**
```typescript
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,  // ✅ Correct - bypasses RLS
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
```

### 2. Added Service Role Key to .env

Added `SUPABASE_SERVICE_ROLE_KEY` to `.env` file (you need to populate this).

## REQUIRED ACTION: Add Your Service Role Key

⚠️ **You must add your Supabase service role key to the `.env` file before this will work.**

### How to Get Your Service Role Key:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `syguxarkhbfidppmygmc`
3. Click **Settings** (gear icon in sidebar)
4. Click **API** in the settings menu
5. Scroll to **Project API keys**
6. Find **service_role** key (NOT the anon key)
7. Click **Reveal** and copy the key
8. Add it to your `.env` file:

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...
```

⚠️ **NEVER commit this key to git or expose it to the client side!**

## Why This Fix Works

### Service Role Key vs Anon Key

| Key Type | Purpose | RLS Enforcement | Use Case |
|----------|---------|-----------------|----------|
| **Anon Key** | Client-side access | ✅ Enforces RLS | Public queries from browser |
| **Service Role Key** | Server-side admin | ❌ Bypasses RLS | Trusted server operations |

### Security Model

- **Client-side** (`/app/f/[slug]/page.tsx`):
  - Uses anon key via `lib/supabase.ts`
  - Can only read published forms (RLS allows)
  - Cannot access conversations/messages (RLS blocks)
  - ✅ This is correct and secure

- **Server-side** (API routes):
  - Uses service role key
  - Can insert/update conversations and messages
  - Bypasses RLS for trusted operations
  - ✅ This is correct and secure

## Expected Network Behavior After Fix

With the service role key configured, your Network tab should show:

### On Public Form Load (`/f/{slug}`):
```
✅ GET /rest/v1/forms?slug=... (200 OK)          [Client: anon key]
✅ POST /api/conversations/start (200 OK)        [Server: service key]
```

### On Message Send:
```
✅ POST /api/chat (200 OK)                       [Server: service key]
```

### You Should NOT See:
```
❌ POST /rest/v1/conversations?select=* (403)    [This was the bug]
❌ POST /rest/v1/messages?select=* (403)         [This was also blocked]
```

## Verification Steps

1. Add service role key to `.env`
2. Restart dev server:
   ```bash
   npm run dev
   ```
3. Open browser DevTools → Network tab
4. Visit `/f/{your-form-slug}` in incognito mode
5. Verify you see:
   - ✅ `POST /api/conversations/start` → 200
   - ❌ NO `POST /rest/v1/conversations` requests

## Why the Error Appeared in Browser Network Tab

Even though API routes run on the server, the error manifested as a browser network request because:

1. Server-side API route tried to insert with anon key
2. Supabase client made POST request to `/rest/v1/conversations`
3. RLS blocked it with 403
4. The API route then returned an error to the browser
5. The browser might have logged the underlying Supabase REST call

With service role key, the API routes bypass RLS and complete successfully.

## Build Status

✅ Application rebuilt successfully
✅ TypeScript compilation passed
✅ All routes generated correctly
⚠️ Waiting for service role key to be configured

## Next Steps

1. Add your service role key to `.env` (see instructions above)
2. Restart the dev server
3. Test the public form in incognito mode
4. Verify no 403 errors in Network tab
