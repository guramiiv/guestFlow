# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GuestFlow.ge is a SaaS platform for Georgian guesthouses and small hotels — booking management, guest profiles, channel sync, and public booking pages. Georgian (ka) is the primary language; English (en) and Russian (ru) are secondary. All currency is GEL (₾). Date format: DD.MM.YYYY.

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite 8 + Tailwind CSS 4 + Base UI (shadcn)
- **Backend:** Django 6 + DRF + SQLite (dev) / PostgreSQL (prod)
- **State:** Zustand (auth), @tanstack/react-query (server state)
- **Forms:** react-hook-form + zod
- **i18n:** react-i18next — Georgian (ka default), English (en), Russian (ru)
- **Auth:** JWT via SimpleJWT — 15min access, 7d refresh tokens

## Commands

```bash
# Frontend (from frontend/)
npm run dev          # Vite dev server
npm run build        # tsc -b && vite build
npm run lint         # ESLint

# Backend (from backend/)
python manage.py runserver          # Django dev server :8000
python manage.py test               # Run all tests
python manage.py test apps.bookings # Run single app tests
python manage.py makemigrations     # Create migrations
python manage.py migrate            # Apply migrations
python test_api.py                  # Manual 12-step integration test
```

## Architecture

### Multi-Tenancy
Every authenticated queryset **must** filter by `property__owner=request.user`. One user = one property (auto-created on registration).

### Two-Tier API (`/api/`)
- **Authenticated:** `/api/auth/`, `/api/property/`, `/api/bookings/`, `/api/guests/`, `/api/reports/`
- **Public (AllowAny):** `/api/public/<slug>/` — guests browse property, check availability, create bookings

### Booking Lifecycle
`pending → confirmed → checked_in → checked_out` (or `cancelled` / `no_show` from any state).
`RoomNight` model enforces `unique(room, date)` — prevents double-booking at DB level.

### Pricing
All prices are `DecimalField(10, 2)` serialized as **strings** in JSON. On the frontend, always `Number(value)` before arithmetic or `.toFixed()`.
Nightly pricing: iterate check_in→check_out dates, apply `SeasonalRate` if exists, else `Room.base_price_gel`.

### Frontend Data Flow
`API layer (axios + interceptors) → react-query (cache + refetch) → Page component → UI`
- Query keys: `['bookings']`, `['booking', id]`, `['guests']`, `['rooms']`, `['dashboard']`, `['publicProperty', slug]`
- Mutations invalidate related query keys on success
- Auth tokens stored in `localStorage` (`access`, `refresh`)
- Public API client (`src/api/public.ts`) uses a separate axios instance without auth interceptors

### Incomplete Apps
`messaging/`, `payments/`, `billing/` are planned but currently empty stubs.

## Conventions

### Backend
- `ModelSerializer` for reads, `ModelCreateSerializer` for writes, `PublicModelSerializer` for unauthenticated endpoints
- `ModelViewSet` for CRUD, `APIView` for custom logic, `@action` for sub-operations (check_in, check_out, cancel, record_payment)
- `perform_create()` always auto-assigns `property` from `request.user.properties.first()`
- Settings module: `config.settings.development` (default), env vars via `django-environ`
- Celery: `CELERY_TASK_ALWAYS_EAGER=True` in dev (runs synchronous); celery pip package is installed but not actively used

### Frontend
- Path alias: `@/` → `src/`
- Functional components only. Icons from `lucide-react`. Use `cn()` from `@/lib/utils` for conditional classes.
- UI primitives in `src/components/ui/` use CVA variants (shadcn/Base UI pattern)
- Every user-facing string uses `t('namespace.key')`. Namespaces: common, auth, nav, dashboard, bookings, rooms, guests, reports, public. Add keys to all 3 locale files.
- Page pattern: `useQuery` for data, `useMutation` + `invalidateQueries` on success, loading skeletons, error states
- Toasts via `sonner`: `toast.success(t('...'))` / `toast.error(t('...'))`

### Styling
- Tailwind 4 with CSS custom properties (oklch colors)
- Brand: navy `#0D2137`, teal `#117A65`, content-bg `#F8F9FA`
- Mobile-first responsive design
- Fonts: Geist Variable (Latin), BPG Nino Mtavruli (Georgian)

## Gotchas

- **Decimal strings:** Django serializes DecimalField as strings — always `Number(value)` before math on frontend
- **Base UI Select:** `onValueChange` value may be typed as `{}` — cast with `String(v ?? '')`
- **Photos:** stored as `JSONField(default=list)` — arrays of Cloudinary URL strings. Upload via `POST /api/property/upload-photo/`, save URLs via PATCH
- **Guest denormalization:** Booking stores guest_name/phone/email/country directly; linked `Guest` record is optional
- **Settings page:** still a placeholder component
