# Railway Deployment Guide

This guide explains how to deploy Residency to Railway with two services: Django backend + React frontend.

## Prerequisites

1. A [Railway](https://railway.app) account
2. Your code pushed to GitHub

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Railway Project                      │
├─────────────────┬─────────────────┬─────────────────────┤
│   PostgreSQL    │  Django Backend │  React Frontend     │
│   (Database)    │  (API Service)  │  (Web Service)      │
│                 │                 │                     │
│                 │  api.example.   │  app.example.       │
│                 │  railway.app    │  railway.app        │
└─────────────────┴─────────────────┴─────────────────────┘
```

## Step-by-Step Deployment

### 1. Create a New Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"New Project"**
3. Select **"Empty Project"**

### 2. Add PostgreSQL Database

1. In your project, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will provision the database and provide `DATABASE_URL`

### 3. Deploy Backend Service

1. Click **"+ New"** → **"GitHub Repo"**
2. Select your repository
3. Configure the service:
   - **Root Directory**: `backend`
   - **Name**: `backend` (or `api`)

4. Add environment variables (Settings → Variables):

   | Variable | Value |
   |----------|-------|
   | `SECRET_KEY` | Generate a secure key (use `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`) |
   | `DJANGO_SETTINGS_MODULE` | `config.settings.prod` |
   | `ALLOWED_HOSTS` | `${{RAILWAY_PUBLIC_DOMAIN}}` |
   | `CORS_ALLOWED_ORIGINS` | `https://<frontend-domain>.railway.app` (add after frontend is deployed) |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (Railway auto-links this) |
   | `EMAIL_BACKEND` | `django.core.mail.backends.console.EmailBackend` (or configure SMTP) |
   | `RESIDENCE_FROM_EMAIL` | `noreply@yourdomain.com` |

5. Generate a public domain:
   - Go to **Settings** → **Networking**
   - Click **"Generate Domain"**
   - Note this URL (e.g., `backend-xxxx.railway.app`)

### 4. Deploy Frontend Service

1. Click **"+ New"** → **"GitHub Repo"**
2. Select the same repository
3. Configure the service:
   - **Root Directory**: `frontend`
   - **Name**: `frontend` (or `web`)

4. Add environment variables:

   | Variable | Value |
   |----------|-------|
   | `VITE_API_URL` | `https://<backend-domain>.railway.app/api/v1` |
   | `NODE_ENV` | `production` |

5. Generate a public domain:
   - Go to **Settings** → **Networking**
   - Click **"Generate Domain"**

### 5. Update Backend CORS

After the frontend is deployed, go back to the backend service and update:

```
CORS_ALLOWED_ORIGINS = https://<frontend-domain>.railway.app
```

### 6. Create Admin User

1. In the backend service, go to **Settings** → **"Railway CLI"** or use the web terminal
2. Run:
   ```bash
   python manage.py createsuperuser
   ```

## Environment Variables Reference

### Backend (Required)

| Variable | Description | Example |
|----------|-------------|---------|
| `SECRET_KEY` | Django secret key | `your-long-random-secret-key` |
| `DJANGO_SETTINGS_MODULE` | Settings module | `config.settings.prod` |
| `ALLOWED_HOSTS` | Comma-separated hosts | `backend-xxxx.railway.app` |
| `DATABASE_URL` | PostgreSQL URL | Auto-provided by Railway |
| `CORS_ALLOWED_ORIGINS` | Frontend URL(s) | `https://frontend-xxxx.railway.app` |

### Backend (Optional)

| Variable | Description | Default |
|----------|-------------|---------|
| `EMAIL_BACKEND` | Email backend class | Console backend |
| `EMAIL_HOST` | SMTP host | - |
| `EMAIL_PORT` | SMTP port | `587` |
| `EMAIL_HOST_USER` | SMTP username | - |
| `EMAIL_HOST_PASSWORD` | SMTP password | - |
| `EMAIL_USE_TLS` | Use TLS | `true` |
| `DEFAULT_FROM_EMAIL` | Default sender | `noreply@example.com` |
| `RESIDENCE_FROM_EMAIL` | Residence emails sender | Same as DEFAULT_FROM_EMAIL |
| `WEB_CONCURRENCY` | Gunicorn workers | Auto-calculated |
| `LOG_LEVEL` | Logging level | `info` |

### Frontend

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://backend-xxxx.railway.app/api/v1` |
| `NODE_ENV` | Environment | `production` |

## Custom Domain (Optional)

1. Go to service **Settings** → **Networking**
2. Click **"+ Custom Domain"**
3. Add your domain (e.g., `api.yourdomain.com` for backend)
4. Update DNS records as instructed
5. Update `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS` accordingly

## Monitoring

- **Logs**: Click on any service → **"Logs"** tab
- **Metrics**: Available in the **"Metrics"** tab
- **Deployments**: View deployment history in **"Deployments"** tab

## Troubleshooting

### Build Fails
- Check the build logs for errors
- Ensure `requirements.txt` (backend) or `package.json` (frontend) are correct

### 500 Errors
- Check backend logs for Python tracebacks
- Verify `DATABASE_URL` is correctly linked
- Ensure migrations have run (`python manage.py migrate`)

### CORS Errors
- Verify `CORS_ALLOWED_ORIGINS` includes the exact frontend URL (with `https://`)
- Check that the frontend `VITE_API_URL` is correct

### Database Connection Issues
- Ensure PostgreSQL service is running
- Check that `DATABASE_URL` reference is correct (`${{Postgres.DATABASE_URL}}`)

## Costs

Railway uses usage-based pricing:
- **Free tier**: $5 credit/month (enough for small apps)
- **Hobby plan**: $5/month with more resources
- PostgreSQL: Included in usage

Typical costs for this app: **$5-15/month** depending on traffic.
