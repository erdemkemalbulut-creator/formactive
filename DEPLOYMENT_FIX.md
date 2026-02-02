# Deployment Fix: API Routes Not Found (404)

## Status

✅ **Local build is correct**
✅ **API routes are included in build**
✅ **Service role key is configured in code**
❌ **Production deployment needs update**

## The Issue

Your production site at `https://formactive.bolt.host` is returning 404 for:
- `POST /api/conversations/start`
- `POST /api/chat`

This happens because the deployed version doesn't have the latest build with the service role key fix.

## Verified Correct in Build

Both routes are present and correctly configured:

```bash
# Routes in build
.next/server/app/api/conversations/start/route.js  ✅
.next/server/app/api/chat/route.js                 ✅

# Both routes use service role key
createClient("...", process.env.SUPABASE_SERVICE_ROLE_KEY, {...})  ✅
```

## Deployment Steps

### Step 1: Add Service Role Key to Production Environment

Your production environment (Netlify) needs the service role key as an environment variable.

#### Get Your Service Role Key:

1. Go to [Supabase Dashboard](https://app.supabase.com/project/syguxarkhbfidppmygmc)
2. Click **Settings** → **API**
3. Under **Project API keys**, find **service_role**
4. Click **Reveal** and copy the key

#### Add to Netlify:

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your site: **formactive**
3. Click **Site configuration** → **Environment variables**
4. Click **Add a variable** → **Add a single variable**
5. Add:
   - **Key:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (paste your service role key)
   - **Scopes:** Select all deploy contexts (Production, Deploy Previews, Branch deploys)
6. Click **Create variable**

⚠️ **CRITICAL:** This key must be server-side only. Never expose it in client-side code or commit it to git.

### Step 2: Redeploy Your Site

After adding the environment variable:

#### Option A: Manual Deploy via Netlify UI
1. In Netlify dashboard → **Deploys**
2. Click **Trigger deploy** → **Deploy site**

#### Option B: Push to Git
If your site is connected to Git, push the latest changes:
```bash
git add .
git commit -m "Fix: Use service role key in API routes"
git push
```

#### Option C: Deploy from Local Build
```bash
# Install Netlify CLI if you haven't
npm install -g netlify-cli

# Build locally
npm run build

# Deploy
netlify deploy --prod
```

### Step 3: Verify Deployment

After deployment completes:

1. Open **Chrome DevTools** → **Network tab**
2. Visit your public form in **incognito mode**: `https://formactive.bolt.host/f/{your-slug}`
3. Verify you see:
   - ✅ `POST /api/conversations/start` → **200 OK**
   - ✅ `POST /api/chat` → **200 OK** (when sending a message)
   - ❌ NO `POST /rest/v1/conversations?select=*` requests

## Expected Network Behavior

### ✅ Correct (After Fix):
```
GET /rest/v1/forms?slug=...&is_published=eq.true  200 OK  [Client: anon key]
POST /api/conversations/start                       200 OK  [Server: service key]
POST /api/chat                                      200 OK  [Server: service key]
```

### ❌ Incorrect (Before Fix):
```
GET /rest/v1/forms?...                              200 OK
POST /api/conversations/start                       404 Not Found  ← Old build
POST /rest/v1/conversations?select=*                403 Forbidden  ← Wrong key
```

## Build Output Verification

Your build includes both API routes as lambdas:

```
Route (app)                              Size     First Load JS
├ λ /api/chat                            0 B                0 B  ✅
├ λ /api/conversations/start             0 B                0 B  ✅
└ λ /f/[slug]                            4.78 kB         134 kB  ✅
```

## Why This Fixes the Issue

### Problem Root Cause:
1. API routes were using `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Anon key enforces RLS policies
3. RLS blocks anon users from inserting into `conversations` and `messages`
4. Result: 403 Forbidden on all database writes

### Solution:
1. API routes now use `SUPABASE_SERVICE_ROLE_KEY`
2. Service role key **bypasses RLS** (trusted server operations)
3. API routes can now create conversations and messages
4. Client-side code still uses anon key (secure, enforces RLS)

## Security Model

| Component | Key Used | RLS | Purpose |
|-----------|----------|-----|---------|
| **Client-side** (`app/f/[slug]/page.tsx`) | Anon Key | ✅ Enforced | Read public forms only |
| **Server API routes** | Service Role | ❌ Bypassed | Trusted operations (insert conversations) |

This is the correct security model:
- Public users can't directly write to conversations
- All writes go through validated API routes
- API routes use service role for trusted operations

## Troubleshooting

### If still getting 404:

1. **Check build output:**
   ```bash
   npm run build
   # Look for: ├ λ /api/conversations/start
   ```

2. **Check Netlify build log:**
   - Go to Netlify dashboard → Deploys → Latest deploy
   - Check build log for "Generating static pages"
   - Verify it shows `/api/conversations/start` as a lambda

3. **Check environment variable:**
   - Netlify dashboard → Site configuration → Environment variables
   - Verify `SUPABASE_SERVICE_ROLE_KEY` is listed
   - Value should start with `eyJhbGciOiJIUzI1NiIs...`

### If getting 500 error instead of 404:

This means the route exists but the service role key is missing or invalid:
1. Verify the key in Netlify environment variables
2. Check it matches the key from Supabase dashboard
3. Redeploy after fixing the key

## Files Modified

- ✅ `app/api/conversations/start/route.ts` - Uses service role key
- ✅ `app/api/chat/route.ts` - Uses service role key
- ✅ `.env` - Added `SUPABASE_SERVICE_ROLE_KEY` placeholder
- ✅ Build output includes both routes

## Next Steps After Deployment

1. Test the public form end-to-end
2. Verify conversations are being created in Supabase
3. Check that messages are being saved
4. Test the complete form submission flow

---

**Ready to deploy once you add the service role key to Netlify!** 🚀
