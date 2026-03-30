---
name: deploy
description: Build, verify, and deploy the latest code to Vercel production
user_invocable: true
---

# Deploy to Vercel

1. Run `npm run build` — fix any errors before proceeding
2. Run `git status` — if uncommitted changes exist, ask whether to commit first
3. Push to origin main: `git push origin main`
4. Vercel auto-deploys from GitHub — check if deploy was triggered:
   - Run `npx vercel ls --prod` or check the Vercel dashboard
5. After deploy, verify the production URL loads correctly:
   - `curl -s -o /dev/null -w "%{http_code}" https://unraveled.ai` (or the current Vercel URL)
6. Report: deployment URL, build status, any warnings
