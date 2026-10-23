# Deploying the backend to Render

The repo has a Render Blueprint (`render.yaml`) that creates:

- **virtualtryon-api**: Docker web service (API + try-on worker), Starter
  plan, 1 GB disk for uploads, Frankfurt region
- **virtualtryon-db**: Postgres, Basic 256 MB plan

Rough cost: about $7 (web) + $0.25 (disk) + $6 (Postgres) per month. Check
Render's pricing page; it changes.

## First deploy

1. Sign in at https://dashboard.render.com with GitHub.
2. **New > Blueprint**, pick the `maliqhassan/virtualtryon` repository.
3. Render reads `render.yaml` and shows the two resources. Click **Apply**.
4. The first build takes several minutes (MediaPipe and OpenCV are large).
   On start, `backend/start.sh` runs migrations and seeds the sample stores.
5. When the service is live, open `https://<your-service>.onrender.com/health`.
   It should return `{"status": "ok"}`.

Every push to `main` redeploys automatically.

## Point the app at it

In `frontend/.env`:

```
EXPO_PUBLIC_API_URL=https://<your-service>.onrender.com
```

Restart Expo (`npx expo start -c`). An `https://` URL is always used, even
in Expo Go, so the phone no longer needs to be on the PC's Wi-Fi.

## Settings

Set in the Render dashboard under the service's **Environment** tab:

| Variable | Value | Notes |
| --- | --- | --- |
| `TRYON_PROVIDER` | `demo` | Placeholder results until FASHN is connected |
| `FULL_BODY_CHECK_ENABLED` | `true` | MediaPipe check that the whole body is in the photo |
| `BACKGROUND_REMOVAL_ENABLED` | `true` | Set `false` if the instance runs out of memory |
| `SECRET_KEY` | generated | Created by the Blueprint; don't change it casually |
| `DATABASE_URL` | from the database | Linked by the Blueprint |

## Logs and problems

- **Logs** tab on the service shows the API and the worker together.
- "Upload folder ... is not writable": the disk isn't mounted at
  `/app/storage/uploads`; check the service's **Disks** settings.
- Out of memory: set `BACKGROUND_REMOVAL_ENABLED=false`, or move to the
  Standard plan.
