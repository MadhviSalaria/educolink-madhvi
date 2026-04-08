# EducoLink Deployment Guide

This project is easiest to deploy in two parts:

1. Frontend on Vercel
2. Backend on Render

That gives you two stable public URLs:

1. Frontend URL for users
2. Backend API URL for app requests and Razorpay verification

## Recommended order

1. Deploy backend first
2. Copy backend public URL
3. Deploy frontend with backend URL in env
4. Copy frontend public URL
5. Add frontend URL to backend CORS and `FRONTEND_APP_URL`
6. Add Razorpay keys only after both URLs are live

## Backend deployment on Render

You can use the included `render.yaml` blueprint to avoid filling most settings manually on Render.

Create a new Web Service on Render and point it to the `backend` folder.

Use these settings:

- Runtime: `Node`
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`

If you use the blueprint, Render will read these values from `render.yaml` automatically.

Set these environment variables in Render:

- `PORT=5001`
- `JWT_SECRET=your_strong_secret`
- `MONGODB_URI=your_mongodb_uri`
- `MONGODB_DB=educolink`
- `SERPER_API_KEY=` if used
- `GOOGLE_CSE_API_KEY=` if used
- `GOOGLE_CSE_CX=` if used
- `GROK_API_KEY=your_grok_key`
- `GROK_MODEL=llama-3.1-8b-instant`
- `CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://your-frontend-domain.vercel.app`
- `FRONTEND_APP_URL=https://your-frontend-domain.vercel.app`

The `FRONTEND_APP_URL=http://localhost:5173` value in `backend/.env.example` is only for local development. Do not put that localhost value into the Vercel frontend project.

Do not add Razorpay keys yet if you do not have the frontend live URL.

Once deployed, note the backend URL, for example:

- `https://educolink-api.onrender.com`

## Frontend deployment on Vercel

Create a new Vercel project and point it to the `frontend` folder.

Use these settings:

- Framework Preset: `Vite`
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`

Set these environment variables in Vercel:

- `VITE_API_BASE_URL=https://your-backend-domain.onrender.com`
- `VITE_GOOGLE_CLIENT_ID=your_google_client_id`

The `frontend/vercel.json` file already rewrites all routes to `index.html`, so React Router works on refresh.

Once deployed, note the frontend URL, for example:

- `https://educolink.vercel.app`

## Final backend env update after frontend deploy

After the frontend is live, go back to Render and update:

- `CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://your-frontend-domain.vercel.app`
- `FRONTEND_APP_URL=https://your-frontend-domain.vercel.app`

Redeploy the backend after updating those values.

## Razorpay setup after deployment

Only after both apps are live, add these in backend env:

- `RAZORPAY_KEY_ID=...`
- `RAZORPAY_KEY_SECRET=...`
- `RAZORPAY_CURRENCY=INR`
- `RAZORPAY_PREMIUM_MONTHLY_AMOUNT=199`
- `RAZORPAY_PREMIUM_YEARLY_AMOUNT=1999`

Then redeploy backend.

## Smoke test checklist

1. Open frontend live URL
2. Register a learner account
3. Confirm backend requests succeed from frontend
4. Open Premium page
5. Confirm plans load
6. Confirm protected premium routes redirect to the Premium page for free users
7. Add Razorpay keys and verify checkout flow

## Common issues

### CORS blocked

Cause:

- Frontend domain missing from `CORS_ORIGINS`

Fix:

- Add exact Vercel URL to backend `CORS_ORIGINS`

### App refresh on module page returns 404

Cause:

- SPA rewrite missing

Fix:

- Keep `frontend/vercel.json`

### Frontend can load but API calls fail

Cause:

- Wrong `VITE_API_BASE_URL`

Fix:

- Set it to the public Render backend URL and redeploy Vercel

### Razorpay opens but verification fails

Cause:

- Wrong `RAZORPAY_KEY_SECRET`
- Backend not redeployed after env update

Fix:

- Correct env values and redeploy backend