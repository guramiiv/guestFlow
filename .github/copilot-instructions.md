# GuestFlow.ge — Copilot Instructions

> Georgian guesthouse/hotel SaaS — booking management, guest profiles, channel sync, public booking page.

## Quick Reference

| Area | Stack |
|------|-------|
| Frontend | React 19 + TypeScript + Vite 8 + Tailwind CSS 4 + Base UI (shadcn) |
| Backend | Django 5 + DRF + SQLite (dev) / PostgreSQL (prod) |
| State | Zustand (auth), @tanstack/react-query (server state) |
| Forms | react-hook-form + zod |
| i18n | react-i18next — Georgian (ka, default), English (en), Russian (ru) |
| Icons | lucide-react |
| Dates | date-fns |
| Images | Cloudinary (upload via backend endpoint) |
| Auth | JWT (SimpleJWT) — 15min access, 7d refresh |
| Currency | GEL (₾) — all prices are `DecimalField` serialized as **strings** |

## Commands

```bash
# Frontend (from frontend/)
npm run dev          # Vite dev server
npm run build        # tsc -b && vite build
npm run lint         # ESLint

# Backend (from backend/)
python manage.py runserver          # Django dev server :8000
python manage.py makemigrations     # Create migrations
python manage.py migrate            # Apply migrations
python manage.py test               # Run tests
python test_api.py                  # Manual 12-step integration test
```

## Project Structure

```
GuestFlow/
├── backend/
│   ├── config/settings/{base,development,production}.py
│   ├── config/{urls,celery}.py
│   ├── apps/
│   │   ├── accounts/       # User model (email-based auth)
│   │   ├── properties/     # Property + Room + SeasonalRate + photo upload
│   │   ├── bookings/       # Booking lifecycle + RoomNight + public booking
│   │   ├── guests/         # Guest profiles + search
│   │   ├── reports/        # Dashboard, revenue, occupancy (view-only)
│   │   ├── messaging/      # Planned — empty
│   │   ├── payments/       # Planned — empty
│   │   └── billing/        # Planned — empty
│   └── test_api.py
├── frontend/
│   └── src/
│       ├── api/            # Axios clients (client.ts = interceptors + token refresh)
│       ├── components/
│       │   ├── ui/         # 13 Base UI / shadcn primitives (button, card, dialog, etc.)
│       │   ├── shared/     # StatusBadge, CurrencyDisplay, DateDisplay
│       │   ├── layout/     # DashboardLayout (sidebar + header)
│       │   └── public/     # PublicLayout, AvailableRoomsList, BookingForm, BookingConfirmation
│       ├── pages/          # Route pages grouped by feature
│       ├── store/          # authStore.ts (Zustand)
│       ├── types/          # index.ts (core), public.ts (public booking)
│       ├── locales/        # en.json, ka.json, ru.json
│       └── lib/            # i18n.ts, utils.ts (cn helper)
```

## Architecture Patterns

### Multi-Tenancy
Every authenticated queryset **must** filter by `property__owner=request.user`. Property is auto-created on registration. One user = one property (current design).

### Two-Tier API (`/api/`)
- **Authenticated** (`/api/auth/`, `/api/property/`, `/api/bookings/`, `/api/guests/`, `/api/reports/`) — owner manages everything
- **Public** (`/api/public/<slug>/`) — guests browse property, check availability, create bookings (AllowAny)

### Booking Lifecycle
`pending → confirmed → checked_in → checked_out` (or `cancelled` / `no_show` from any state).  
`RoomNight` model enforces unique(room, date) constraint — prevents double-booking at DB level.

### Pricing
All prices are `DecimalField(10, 2)` in Django, serialized as **strings** in JSON. Always wrap with `Number()` before `.toFixed()` or arithmetic on the frontend.  
Nightly pricing: iterate check_in→check_out dates, apply `SeasonalRate` if exists, else `Room.base_price_gel`.

### Frontend Data Flow
```
API layer (axios + interceptors) → react-query (cache + refetch) → Page component → UI
```
- Query keys: `['bookings']`, `['booking', id]`, `['guests']`, `['rooms']`, `['dashboard']`, `['publicProperty', slug]`
- Mutations invalidate related query keys on success
- Auth tokens in `localStorage` (`access`, `refresh`)

## Conventions

### Backend (Django/DRF)
- **Serializers**: `ModelSerializer` for reads, `ModelCreateSerializer` for writes with nested handling, `PublicModelSerializer` for unauthenticated endpoints
- **Views**: `ModelViewSet` for CRUD, `APIView` for custom logic, `@action` decorators for sub-operations (check_in, check_out, cancel, record_payment)
- **`perform_create()`** always auto-assigns `property` from `request.user.properties.first()`
- **Settings**: `config.settings.development` (default), uses `django-environ` for env vars
- **Celery**: `CELERY_TASK_ALWAYS_EAGER=True` in dev (synchronous)

### Frontend (React/TypeScript)
- **Path alias**: `@/` → `src/`
- **Components**: functional components, no classes. Use `lucide-react` icons. Use `cn()` from `@/lib/utils` for conditional classes.
- **UI Kit**: Base UI via shadcn — components in `src/components/ui/` use CVA variants. Button has variants: default, outline, secondary, ghost, destructive, link. Sizes: xs, sm, default, lg, icon.
- **Forms**: `useForm<T>` + `zodResolver(schema)` + controlled `<Input>` / `<Select>`. Zod schemas defined per-component.
- **Translations**: every user-facing string uses `t('namespace.key')`. Namespaces: common, auth, nav, dashboard, bookings, rooms, guests, reports, public. Add keys to all 3 locale files (ka.json, en.json, ru.json).
- **Page pattern**: `useQuery` for data, `useMutation` with `onSuccess: () => queryClient.invalidateQueries(...)`, loading skeletons, error states, `Card` + `Table` layout.
- **Navigation**: `useNavigate()` for programmatic nav, `<Link>` for inline links. Back buttons use `<ArrowLeft>` icon.
- **Toasts**: `sonner` — `toast.success(t('...'))` / `toast.error(t('...'))` on mutation results.
- **Detail pages**: `useParams()` for ID, single `useQuery`, info sections in `Card` components, action buttons for state transitions.

### Styling
- **Tailwind 4** with CSS custom properties for theming (oklch colors)
- **Brand colors**: navy `#0D2137`, teal `#117A65`, content-bg `#F8F9FA`
- **Responsive**: mobile-first. Breakpoints: default (mobile), `sm:` 640px, `md:` 768px, `lg:` 1024px
- **Font**: Geist Variable (Latin), BPG Nino Mtavruli (Georgian)
- **Border radius**: 0.625rem (10px) via `--radius` CSS var

## Gotchas

- **Decimal strings**: Django serializes `DecimalField` as strings. Always `Number(value)` before math/`.toFixed()`.
- **Celery not installed**: `celery` pip package isn't in the venv — import errors if Django tries to load celery config. Tasks run eagerly anyway in dev.
- **Base UI Select**: `onValueChange` callback value may be typed as `{}` — cast with `String(v ?? '')`.
- **Public API client**: `src/api/public.ts` uses a separate axios instance without auth interceptors.
- **Photos**: stored as `JSONField(default=list)` — arrays of Cloudinary URL strings. Upload via `POST /api/property/upload-photo/`, save URLs via PATCH.
- **Guest denormalization**: Booking stores guest_name/phone/email/country directly. A linked `Guest` record is optional.
- **Placeholder pages**: `Settings` page is still a `<Placeholder>` component.
