# HELPY GLOBAL 4.0
Marketplace mondial: Buy • Sell • Offer Services • Find Services • Discover Businesses.

## Setup
1. Create a Supabase project.
2. Run `supabase-schema.sql` in Supabase SQL Editor.
3. Put Supabase Project URL + public anon key in `public/config.js`.
4. Push to GitHub.
5. Import repo into Vercel and deploy.
6. Replace `HELPY_URL` in the Android MainActivity with the final Vercel URL.
7. GitHub Actions → Build HELPY APK → Run workflow → download `helpy-release-apk`.

Never put the Supabase `service_role` key in frontend code.
