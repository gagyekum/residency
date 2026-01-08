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
│   └── residences/     # Residence CRUD with permissions
│       ├── models.py   # Residence, PhoneNumber, EmailAddress
│       ├── views.py    # ResidenceViewSet
│       ├── serializers.py
│       ├── permissions.py  # DjangoModelPermissions
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
│   │   └── residences.tsx # CRUD interface with permissions
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

### Permission System
- Uses Django model permissions (view, add, change, delete)
- Frontend fetches user permissions via `/me` endpoint
- UI elements hidden based on permissions:
  - Add button: requires `residences.add_residence`
  - Edit button: requires `residences.change_residence`
  - Delete button: requires `residences.delete_residence`
- 403 errors handled gracefully with user-friendly messages

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

## Production Deployment

```bash
# Run with gunicorn
gunicorn config.wsgi:application --config gunicorn.conf.py

# Or use Procfile (for Heroku/Railway/etc.)
# release: python manage.py migrate --noinput && python manage.py collectstatic --noinput
# web: gunicorn config.wsgi:application --config gunicorn.conf.py
```
