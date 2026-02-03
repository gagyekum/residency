# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**App Name: Residency** (not Tenancy)

Residency is a full-stack application for managing residential properties. It consists of a Django REST Framework backend and a React Router v7 frontend with Material UI.

## Development Commands

### Running the App Locally

The frontend and backend are connected via proxy:
- **Vite** (port 5173) proxies `/api` requests to Django (port 8000)
- **Django** (port 8000) proxies frontend requests to Vite (port 5173)

You can access the app via either port - both work the same way.

```bash
# Terminal 1: Start backend (from backend/)
source .venv/bin/activate
python manage.py runserver

# Terminal 2: Start frontend (from frontend/)
npm run dev

# Access app at http://localhost:5173 or http://localhost:8000
```

### With ngrok (for mobile testing)
```bash
# Add ngrok host to ALLOWED_HOSTS
ALLOWED_HOSTS=your-subdomain.ngrok-free.app python manage.py runserver

# In another terminal
ngrok http 8000
```

### Backend Commands (run from `backend/` directory)
```bash
source .venv/bin/activate     # Activate virtual environment
python manage.py runserver    # Run development server
python manage.py migrate      # Run migrations
python manage.py makemigrations # Create new migrations
python manage.py test         # Run all tests
python manage.py test apps.users # Run tests for a specific app
python manage.py createsuperuser # Create superuser
pip install -r requirements.txt  # Install dependencies
```

### Frontend Commands (run from `frontend/` directory)
```bash
npm run dev       # Start development server (port 5173)
npm run build     # Build for production
npm run start     # Serve production build
npm run typecheck # TypeScript type checking
```

## Architecture

### Backend Structure
```
backend/
├── apps/
│   ├── users/          # Custom user model, JWT auth, /me endpoint
│   │   ├── models.py   # User model with email as USERNAME_FIELD
│   │   ├── views.py    # CurrentUserView (returns user + permissions)
│   │   ├── serializers.py
│   │   └── urls.py     # /token/, /token/refresh/, /me/
│   ├── residences/     # Residence CRUD with permissions
│   │   ├── models.py   # Residence, PhoneNumber, EmailAddress
│   │   ├── views.py    # ResidenceViewSet
│   │   ├── serializers.py
│   │   ├── permissions.py  # DjangoModelPermissions
│   │   └── urls.py
│   └── messaging/      # Email & SMS messaging system
│       ├── models.py   # MessageJob, EmailRecipient, SMSRecipient
│       ├── views.py    # MessageJobViewSet with status/retry actions
│       ├── serializers.py
│       ├── permissions.py  # MessageJobPermissions
│       ├── tasks.py    # Background job processing (threading)
│       ├── sms_backends.py # Pluggable SMS backends (Console, MNotify)
│       ├── admin.py    # Read-only admin views
│       └── urls.py
├── config/
│   ├── settings/
│   │   ├── base.py     # Common settings (JWT, CORS, REST framework)
│   │   ├── dev.py      # Development (DEBUG=True, DB_* variables)
│   │   └── prod.py     # Production (DEBUG=False, DATABASE_URL)
│   ├── proxy.py        # Proxies frontend requests to Vite dev server
│   ├── urls.py         # API routes under /api/v1/
│   └── wsgi.py / asgi.py
├── gunicorn.conf.py    # Gunicorn production config
├── Procfile            # Production deployment commands
└── manage.py
```

### Frontend Structure
```
frontend/
├── app/
│   ├── routes/
│   │   ├── home.tsx       # Landing page with navigation
│   │   ├── login.tsx      # JWT login form
│   │   ├── residences.tsx # CRUD interface with permissions
│   │   └── messaging.tsx  # Email/SMS compose, job list, status tracking
│   ├── lib/
│   │   ├── auth.ts        # Token management (store, refresh, clear)
│   │   └── api.ts         # API client with permission handling
│   └── routes.ts          # Route configuration
└── package.json
```

## Key Features

### Authentication
- JWT-based authentication (access: 15min, refresh: 7 days)
- Token refresh mechanism in frontend
- Login redirects to home page (`/`)

### API Endpoints
- `POST /api/v1/users/token/` - Obtain JWT tokens
- `POST /api/v1/users/token/refresh/` - Refresh access token
- `GET /api/v1/users/me/` - Get current user with permissions
- `GET/POST /api/v1/residences/` - List/Create residences
- `GET/PUT/PATCH/DELETE /api/v1/residences/{id}/` - Residence detail
- `GET/POST /api/v1/messaging/` - List/Create message jobs
- `GET /api/v1/messaging/{id}/` - Message job detail
- `GET /api/v1/messaging/{id}/status/` - Lightweight polling for job progress
- `GET /api/v1/messaging/{id}/email-recipients/` - Paginated email recipients
- `GET /api/v1/messaging/{id}/sms-recipients/` - Paginated SMS recipients
- `POST /api/v1/messaging/{id}/retry/` - Retry failed messages
- Legacy alias: `/api/v1/emails/` maps to the same messaging views

### Permission System
- Uses Django model permissions (view, add, change, delete)
- Frontend fetches user permissions via `/me` endpoint
- UI elements hidden based on permissions:
  - Add button: requires `residences.add_residence`
  - Edit button: requires `residences.change_residence`
  - Delete button: requires `residences.delete_residence`
- 403 errors handled gracefully with user-friendly messages
- Messaging permissions:
  - Send button: requires `messaging.add_messagejob`
  - View jobs: requires `messaging.view_messagejob`

### Messaging System
- Dual-channel messaging: Email and SMS to residence contacts
- Creating a message job auto-discovers recipients from residence phone numbers and email addresses
- Background processing via threading (not Celery) — jobs start immediately and process asynchronously
- Batch processing with configurable batch size and delay between batches
- Per-channel statistics tracking (sent/failed counts for email and SMS separately)
- Job statuses: PENDING → PROCESSING → COMPLETED/FAILED
- Retry support for failed recipients
- Frontend features:
  - Compose dialog with channel selection (Email, SMS, or both)
  - SMS character counter and segment calculator
  - Real-time progress polling (2-second intervals)
  - Paginated recipient lists with status per recipient
  - Mobile-responsive card layout / desktop table layout

### SMS Backends
- Pluggable backend system (similar to Django's email backends)
- **ConsoleSMSBackend** — prints to terminal (used in development)
- **MNotifyBackend** — production SMS delivery via [MNotify API](https://mnotify.com)
- Configured via `SMS_BACKEND` setting in `base.py`

### Database
- PostgreSQL (configured via environment variables)
- Connection: `postgresql://user:pass@localhost:5432/tenancy`

## Frontend Design Guidelines

- **All pages and dialogs must be mobile-friendly**
- Use MUI's responsive breakpoints (`xs`, `sm`, `md`, `lg`, `xl`)
- Use `useMediaQuery` and `useTheme` for conditional rendering
- Dialogs should be `fullScreen` on mobile devices
- Tables should convert to card layouts on mobile
- Form fields should stack vertically on mobile
- Use responsive spacing: `sx={{ mt: { xs: 2, sm: 4 } }}`

## Key Dependencies

### Backend
- Django 5.2.9
- Django REST Framework 3.16.1
- djangorestframework-simplejwt (JWT auth)
- django-cors-headers (CORS support)
- psycopg2-binary (PostgreSQL)
- python-dotenv (environment variables)
- gunicorn (production server)
- whitenoise (static files)
- dj-database-url (production database config)

### Frontend
- React Router v7 (Remix)
- Material UI (@mui/material, @mui/icons-material)
- TypeScript

## Environment Variables

`.env` file in project root (see `.env.example`):

### Development
```
SECRET_KEY=your-secret-key
DJANGO_SETTINGS_MODULE=config.settings.dev
DB_NAME=tenancy
DB_USER=your-user
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=5432
```

### Production
```
SECRET_KEY=your-secret-key
DJANGO_SETTINGS_MODULE=config.settings.prod
DATABASE_URL=postgres://user:password@host:5432/dbname
ALLOWED_HOSTS=yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com
```

### SMS & Email Configuration
```
MNOTIFY_API_KEY=your-mnotify-api-key       # MNotify SMS provider API key
MNOTIFY_SENDER_ID=YourSenderID             # SMS sender name
EMAIL_BATCH_SIZE=50                         # Emails per batch (default: 50)
EMAIL_BATCH_DELAY=1.0                       # Seconds between email batches (default: 1.0)
SMS_BATCH_SIZE=50                           # SMS messages per batch (default: 50)
SMS_BATCH_DELAY=1.0                         # Seconds between SMS batches (default: 1.0)
DEFAULT_FROM_EMAIL_DISPLAY_NAME=Residency Administrator  # Email "From" display name
```

## Production Deployment

```bash
# Run with gunicorn
gunicorn config.wsgi:application --config gunicorn.conf.py

# Or use Procfile (for Heroku/Railway/etc.)
# release: python manage.py migrate --noinput && python manage.py collectstatic --noinput
# web: gunicorn config.wsgi:application --config gunicorn.conf.py
```
