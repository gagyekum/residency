# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**App Name: Residency** (not Tenancy)

Residency is a full-stack application for managing residential properties. It consists of a Django REST Framework backend and a React Router v7 frontend with Material UI.

## Development Commands

### Backend (run from `backend/` directory)
```bash
# Activate virtual environment
source .venv/bin/activate

# Run development server
python manage.py runserver

# Run migrations
python manage.py migrate

# Create new migrations
python manage.py makemigrations

# Run all tests
python manage.py test

# Run tests for a specific app
python manage.py test apps.users
python manage.py test apps.residences

# Run a single test class or method
python manage.py test apps.users.tests.TestClassName
python manage.py test apps.users.tests.TestClassName.test_method_name

# Create superuser
python manage.py createsuperuser

# Install dependencies
pip install -r requirements.txt
```

### Frontend (run from `frontend/` directory)
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
│   │   ├── dev.py      # Development (DEBUG=True)
│   │   └── prod.py     # Production (DEBUG=False)
│   ├── urls.py         # API routes under /api/v1/
│   └── wsgi.py / asgi.py
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

### Frontend
- React Router v7 (Remix)
- Material UI (@mui/material, @mui/icons-material)
- TypeScript

## Environment Variables

Backend `.env` file (in `backend/`):
```
SECRET_KEY=your-secret-key
DEBUG=True
DB_NAME=tenancy
DB_USER=your-user
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=5432
```
