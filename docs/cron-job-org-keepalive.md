# cron-job.org Keep-Alive Setup

Use this to reduce idle pauses on free Render and Supabase deployments.

## Target Endpoint

Ping the backend database health endpoint:

```text
https://YOUR_BACKEND_URL/health/db
```

If using the current example deployment URL from this repo:

```text
https://iot-energy-monitor-api.onrender.com/health/db
```

## cron-job.org Settings

- Title: `Render + Supabase Keep Alive`
- Method: `GET`
- URL: `https://YOUR_BACKEND_URL/health/db`
- Schedule: every `10 minutes`
- Timeout: default
- Request body: none
- Headers: none

## Setup Steps

1. Sign in to `cron-job.org`.
2. Create a new cron job.
3. Enter the URL:
   - `https://YOUR_BACKEND_URL/health/db`
4. Set the method to `GET`.
5. Set the interval to every `10 minutes`.
6. Save and enable the job.

## Why Use `/health/db`

This endpoint is better than pinging the homepage because it:

- wakes the Render backend service
- checks database connectivity
- helps reduce idle cold starts

## Notes

- This is a best-effort workaround for free tiers.
- It may reduce pauses, but it does not guarantee always-on uptime.
- If you need guaranteed uptime, upgrade from the free tier.
- Avoid very frequent pinging like every 1 minute because it creates unnecessary synthetic traffic.

## Validation

After enabling the cron job:

1. Leave the site idle for a while.
2. Open the app again.
3. Check whether cold starts happen less often.
4. Optionally test:
   - `https://YOUR_BACKEND_URL/health`
   - `https://YOUR_BACKEND_URL/health/db`
