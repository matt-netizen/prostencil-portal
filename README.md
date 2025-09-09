# ProStencil Portal (Super Simple)

This repo has **no `vercel.json`**. Vercel will auto-detect the Serverless Function in `/api`.

## Deploy in 5 steps

1) **Create a new GitHub repo** (empty) and upload these files.
2) In **Vercel → Add New Project → Import** that repo.
3) In Vercel → Project → **Settings → Environment Variables**, add:
```
XERO_CLIENT_ID=YOUR_CLIENT_ID
XERO_CLIENT_SECRET=YOUR_CLIENT_SECRET
XERO_REDIRECT_URI=https://<your-vercel-domain>.vercel.app/oauth/callback
SESSION_SECRET=superlongrandomvalue
BASE_URL=https://<your-vercel-domain>.vercel.app
```
4) Click **Deploy**.
5) Open `https://<your-vercel-domain>.vercel.app/health` (should return `{ ok: true }`). Then visit `/portal` and click **Connect to Xero**.

## Important
- Ensure your repo does **NOT** contain `vercel.json` or `now.json`.
- In Xero Developer → your App → **Redirect URIs**, add the exact callback:
  - `https://<your-vercel-domain>.vercel.app/oauth/callback`
- Later, after adding a custom domain (e.g., `portal.yourdomain.com`), update `XERO_REDIRECT_URI` and add that URI in Xero as well.

## Local test (optional)
```
npm i
SESSION_SECRET=dev XERO_CLIENT_ID=xxx XERO_CLIENT_SECRET=yyy XERO_REDIRECT_URI=http://localhost:3000/oauth/callback node api/index.js
```
Visit http://localhost:3000/health
