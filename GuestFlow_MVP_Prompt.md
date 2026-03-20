# GuestFlow.ge — MVP Build Prompt for Claude Code / Cursor

> **How to use this prompt:** Copy the entire content below and paste it as your initial prompt in Claude Code (terminal) or Cursor (AI composer). For best results, start a new project folder and run this as the first instruction. The prompt is designed to be executed in phases — complete Phase 1 before moving to Phase 2, etc.

---

## PROJECT CONTEXT

You are building **GuestFlow.ge** — a SaaS platform for Georgian guesthouses and small hotels. It is an all-in-one booking management, guest management, and channel synchronization tool, fully localized in Georgian language.

**Tech Stack:**
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend:** Django 5.x + Django REST Framework + PostgreSQL + Redis + Celery
- **AI:** OpenAI GPT-4o for translations and content generation
- **Payments:** BOG iPay (Bank of Georgia) for guest payments, Stripe for SaaS billing
- **Notifications:** Twilio (SMS/WhatsApp), SendGrid (email)
- **Hosting:** Vercel (frontend), Railway (backend), Supabase (database + storage), Upstash (Redis)

**Key requirement:** The entire UI must support Georgian (ქართული) as the primary language and English as secondary. Use react-i18next for internationalization. All currency is GEL (₾). Date format: DD.MM.YYYY.

---

## PHASE 1: PROJECT SCAFFOLD + AUTH + DATABASE (Build this first)

### Step 1.1 — Django Backend Setup

Create a Django project with the following structure:

```
guestflow-backend/
├── config/                  # Django project settings
│   ├── settings/
│   │   ├── base.py         # Shared settings
│   │   ├── development.py  # Dev overrides
│   │   └── production.py   # Prod overrides
│   ├── urls.py
│   ├── celery.py           # Celery configuration
│   └── wsgi.py
├── apps/
│   ├── accounts/           # User auth + profiles
│   ├── properties/         # Property + Room management
│   ├── bookings/           # Booking lifecycle + availability
│   ├── guests/             # Guest profiles + history
│   ├── messaging/          # Guest messaging + AI translation
│   ├── payments/           # BOG iPay + payment tracking
│   ├── reports/            # Revenue + occupancy reports
│   └── billing/            # SaaS subscription management
├── requirements/
│   ├── base.txt
│   ├── development.txt
│   └── production.txt
├── manage.py
└── Dockerfile
```

**Django settings requirements:**
- Use environment variables for all secrets (django-environ)
- PostgreSQL database (dj-database-url for connection string)
- Redis for caching and Celery broker
- CORS allowed origins for frontend
- JWT auth via djangorestframework-simplejwt (15min access, 7d refresh)
- Default pagination: 20 items per page
- Timezone: Asia/Tbilisi

**Required packages (requirements/base.txt):**
```
Django>=5.0
djangorestframework>=3.15
djangorestframework-simplejwt>=5.3
django-cors-headers>=4.3
django-environ>=0.11
django-filter>=24.0
dj-database-url>=2.1
psycopg2-binary>=2.9
celery>=5.3
redis>=5.0
gunicorn>=21.2
whitenoise>=6.6
Pillow>=10.2
openai>=1.12
boto3>=1.34
```

### Step 1.2 — Database Models

Create these models with full field definitions:

**accounts/models.py — User:**
```python
# Extend AbstractUser
# Fields: email (unique, used as username), first_name, last_name, phone, language (default='ka'), is_property_owner (bool)
# Use email as the USERNAME_FIELD
```

**properties/models.py — Property:**
```python
# Fields:
# - owner (FK to User)
# - name_ka (CharField 255) — property name in Georgian
# - name_en (CharField 255, blank=True) — property name in English
# - slug (SlugField 100, unique) — URL slug for public booking page
# - property_type (choices: guesthouse, hotel, apartment, villa)
# - description_ka (TextField) — description in Georgian
# - description_en (TextField, blank=True) — description in English
# - address_ka (TextField) — address in Georgian
# - city (CharField 100) — city name
# - region (choices: tbilisi, kakheti, imereti, adjara, svaneti, mtskheta_mtianeti, guria, samegrelo, racha, kvemo_kartli, shida_kartli, samtskhe_javakheti)
# - latitude (DecimalField 10,8, nullable)
# - longitude (DecimalField 11,8, nullable)
# - phone (CharField 20)
# - whatsapp (CharField 20, blank=True)
# - email (EmailField)
# - check_in_time (TimeField, default=14:00)
# - check_out_time (TimeField, default=12:00)
# - house_rules_ka (TextField, blank=True)
# - house_rules_en (TextField, blank=True)
# - tax_id (CharField 20, blank=True) — Georgian tax ID
# - amenities (JSONField, default=list) — property-level amenities
# - photos (JSONField, default=list) — array of photo URLs
# - plan (choices: starter, pro, business, default=starter)
# - is_active (BooleanField, default=True)
# - created_at, updated_at (auto timestamps)
#
# Methods: __str__, get_absolute_url
# Meta: ordering = ['-created_at']
```

**properties/models.py — Room:**
```python
# Fields:
# - property (FK to Property, related_name='rooms')
# - name_ka (CharField 100) — e.g., "ოთახი 201"
# - name_en (CharField 100, blank=True) — e.g., "Room 201"
# - room_type (choices: single, double, twin, family, suite, dorm)
# - max_guests (PositiveIntegerField, default=2)
# - base_price_gel (DecimalField 10,2) — nightly rate in GEL
# - description_ka (TextField, blank=True)
# - description_en (TextField, blank=True)
# - amenities (JSONField, default=list)
# - photos (JSONField, default=list)
# - floor (PositiveIntegerField, default=1)
# - is_active (BooleanField, default=True)
# - sort_order (PositiveIntegerField, default=0)
# - created_at, updated_at
```

**properties/models.py — SeasonalRate:**
```python
# Fields:
# - room (FK to Room, related_name='seasonal_rates')
# - name_ka (CharField 100) — e.g., "ზაფხული"
# - start_date (DateField)
# - end_date (DateField)
# - price_gel (DecimalField 10,2)
# - min_stay (PositiveIntegerField, default=1)
```

**bookings/models.py — RoomNight:**
```python
# This is the CRITICAL model for preventing double-bookings.
# Each row represents one room being occupied for one night.
# Fields:
# - room (FK to Room)
# - date (DateField)
# - booking (FK to Booking, related_name='room_nights')
# Meta: unique_together = ['room', 'date']  # DATABASE-LEVEL double-booking prevention
```

**bookings/models.py — Booking:**
```python
# Fields:
# - property (FK to Property, related_name='bookings')
# - room (FK to Room, related_name='bookings')
# - guest (FK to Guest, related_name='bookings', nullable=True)
# - source (choices: direct, booking_com, airbnb, phone, walkin)
# - external_id (CharField 100, blank=True) — Booking.com/Airbnb ID
# - status (choices: pending, confirmed, checked_in, checked_out, cancelled, no_show)
# - check_in (DateField)
# - check_out (DateField)
# - num_guests (PositiveIntegerField, default=1)
# - num_nights (PositiveIntegerField) — computed on save
# - total_price_gel (DecimalField 10,2)
# - paid_amount_gel (DecimalField 10,2, default=0)
# - payment_status (choices: unpaid, partial, paid, refunded)
# - payment_method (choices: cash, bog_ipay, tbc_pay, bank_transfer, channel, nullable)
# - guest_name (CharField 200) — denormalized for quick display
# - guest_phone (CharField 20, blank=True)
# - guest_email (EmailField, blank=True)
# - guest_country (CharField 2, blank=True) — ISO code
# - notes (TextField, blank=True) — internal notes
# - guest_message (TextField, blank=True) — message from guest
# - created_at, updated_at
#
# Methods:
# - save(): compute num_nights, create RoomNight entries
# - cancel(): delete RoomNight entries, set status to cancelled
# - check_availability(): class method to check if room is free for date range
#
# IMPORTANT: Override save() to:
# 1. Calculate num_nights from check_in/check_out
# 2. Create RoomNight entries for each night (check_in to check_out - 1 day)
# 3. If RoomNight creation fails (unique constraint), raise ValidationError
```

**guests/models.py — Guest:**
```python
# Fields:
# - property (FK to Property, related_name='guests')
# - first_name (CharField 100)
# - last_name (CharField 100)
# - email (EmailField, blank=True)
# - phone (CharField 20, blank=True)
# - country (CharField 2, blank=True)
# - language (CharField 2, default='en') — preferred language
# - id_type (choices: passport, national_id, driving_license, blank=True)
# - id_number (CharField 50, blank=True) — encrypted
# - total_stays (PositiveIntegerField, default=0) — denormalized
# - total_spent_gel (DecimalField 10,2, default=0)
# - notes (TextField, blank=True)
# - created_at, updated_at
#
# Methods: full_name property, __str__
```

### Step 1.3 — API Serializers and Views

Create DRF serializers and ViewSets for all models. Every ViewSet must:
1. Filter by the current user's property (multi-tenancy enforcement)
2. Use `get_queryset()` to scope all data: `return Model.objects.filter(property__owner=self.request.user)`
3. Include proper validation
4. Use nested serializers where appropriate (e.g., Room includes SeasonalRates)

**Required API endpoints:**

```
# Auth
POST   /api/auth/register/       — Register (creates User + Property)
POST   /api/auth/login/          — JWT token pair
POST   /api/auth/refresh/        — Refresh token
GET    /api/auth/me/             — Current user profile

# Property
GET    /api/property/            — Current user's property
PATCH  /api/property/            — Update property settings

# Rooms
GET    /api/rooms/               — List rooms
POST   /api/rooms/               — Create room
GET    /api/rooms/:id/           — Room detail
PATCH  /api/rooms/:id/           — Update room
DELETE /api/rooms/:id/           — Deactivate room
GET    /api/rooms/:id/availability/?start=YYYY-MM-DD&end=YYYY-MM-DD  — Check availability

# Bookings
GET    /api/bookings/            — List (filter by status, date range, source)
POST   /api/bookings/            — Create booking (validates availability via RoomNight)
GET    /api/bookings/:id/        — Detail
PATCH  /api/bookings/:id/        — Update
POST   /api/bookings/:id/check-in/    — Mark checked in
POST   /api/bookings/:id/check-out/   — Mark checked out
POST   /api/bookings/:id/cancel/      — Cancel (frees RoomNight entries)
POST   /api/bookings/:id/payment/     — Record payment
GET    /api/bookings/calendar/?start=YYYY-MM-DD&end=YYYY-MM-DD  — Calendar data

# Guests
GET    /api/guests/              — List (searchable by name, email, phone)
GET    /api/guests/:id/          — Detail with booking history
PATCH  /api/guests/:id/          — Update

# Reports
GET    /api/reports/dashboard/   — Dashboard summary (today's check-ins/outs, occupancy, revenue)
GET    /api/reports/revenue/?period=month&start=YYYY-MM-DD  — Revenue report
GET    /api/reports/occupancy/?start=YYYY-MM-DD&end=YYYY-MM-DD  — Occupancy report

# Public Booking (no auth required)
GET    /api/public/:slug/                    — Property info for booking page
GET    /api/public/:slug/availability/?start=YYYY-MM-DD&end=YYYY-MM-DD&guests=2  — Available rooms
POST   /api/public/:slug/book/               — Create direct booking
```

### Step 1.4 — React Frontend Setup

Create the React frontend:

```
guestflow-frontend/
├── src/
│   ├── api/                 # API client (axios instance + hooks)
│   │   ├── client.ts       # Axios instance with JWT interceptor
│   │   ├── auth.ts         # Auth API calls
│   │   ├── rooms.ts        # Room API calls
│   │   ├── bookings.ts     # Booking API calls
│   │   ├── guests.ts       # Guest API calls
│   │   └── reports.ts      # Report API calls
│   ├── components/
│   │   ├── layout/         # DashboardLayout, Sidebar, Header
│   │   ├── ui/             # shadcn/ui components
│   │   ├── bookings/       # BookingCalendar, BookingCard, BookingForm
│   │   ├── rooms/          # RoomCard, RoomForm, RoomList
│   │   ├── guests/         # GuestCard, GuestForm, GuestList
│   │   └── shared/         # StatusBadge, CurrencyDisplay, DateDisplay
│   ├── pages/
│   │   ├── auth/           # LoginPage, RegisterPage
│   │   ├── dashboard/      # DashboardPage
│   │   ├── bookings/       # BookingsPage, BookingDetailPage, CalendarPage
│   │   ├── rooms/          # RoomsPage
│   │   ├── guests/         # GuestsPage, GuestDetailPage
│   │   ├── reports/        # ReportsPage
│   │   ├── settings/       # SettingsPage
│   │   └── public/         # PublicBookingPage (no auth)
│   ├── hooks/              # Custom hooks (useAuth, useProperty, etc.)
│   ├── store/              # Zustand stores
│   ├── locales/
│   │   ├── ka.json         # Georgian translations
│   │   └── en.json         # English translations
│   ├── lib/
│   │   ├── utils.ts        # Helper functions
│   │   └── constants.ts    # App constants (regions, room types, etc.)
│   ├── types/              # TypeScript interfaces matching Django models
│   ├── App.tsx
│   ├── main.tsx
│   └── router.tsx          # React Router config
├── index.html
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── package.json
```

**Important frontend requirements:**

1. **Axios interceptor:** Attach JWT from httpOnly cookie or localStorage. On 401, attempt refresh. On refresh failure, redirect to /login.

2. **TanStack Query:** Use for ALL API calls. Configure:
   - `staleTime: 30_000` (30 seconds)
   - `refetchInterval: 60_000` for dashboard data
   - Optimistic updates for booking status changes

3. **Internationalization (react-i18next):**
   - Georgian as default language
   - Include translations for ALL UI labels, buttons, errors, and messages
   - Georgian date format: `DD.MM.YYYY`
   - Currency format: `₾1,250.00` (GEL symbol prefix)
   - Here's the minimum Georgian translation keys needed for Phase 1:

```json
{
  "common": {
    "save": "შენახვა",
    "cancel": "გაუქმება",
    "delete": "წაშლა",
    "edit": "რედაქტირება",
    "create": "შექმნა",
    "search": "ძიება",
    "loading": "იტვირთება...",
    "error": "შეცდომა",
    "success": "წარმატება",
    "confirm": "დადასტურება",
    "back": "უკან",
    "next": "შემდეგი",
    "yes": "დიახ",
    "no": "არა",
    "all": "ყველა",
    "none": "არცერთი",
    "actions": "მოქმედებები",
    "status": "სტატუსი",
    "date": "თარიღი",
    "total": "ჯამი"
  },
  "auth": {
    "login": "შესვლა",
    "register": "რეგისტრაცია",
    "logout": "გასვლა",
    "email": "ელ. ფოსტა",
    "password": "პაროლი",
    "confirmPassword": "გაიმეორეთ პაროლი",
    "forgotPassword": "დაგავიწყდათ პაროლი?",
    "welcomeBack": "კეთილი იყოს თქვენი დაბრუნება",
    "createAccount": "ანგარიშის შექმნა"
  },
  "nav": {
    "dashboard": "მთავარი",
    "calendar": "კალენდარი",
    "bookings": "ჯავშნები",
    "rooms": "ოთახები",
    "guests": "სტუმრები",
    "messages": "შეტყობინებები",
    "reports": "ანგარიშები",
    "settings": "პარამეტრები"
  },
  "dashboard": {
    "todayCheckIns": "დღევანდელი ჩასახლებები",
    "todayCheckOuts": "დღევანდელი გასვლები",
    "occupancy": "დატვირთვა",
    "monthRevenue": "თვის შემოსავალი",
    "recentBookings": "ბოლო ჯავშნები",
    "upcomingArrivals": "მოსალოდნელი სტუმრები"
  },
  "bookings": {
    "newBooking": "ახალი ჯავშანი",
    "checkIn": "ჩასახლება",
    "checkOut": "გასვლა",
    "status": {
      "pending": "მოლოდინში",
      "confirmed": "დადასტურებული",
      "checked_in": "ჩასახლებული",
      "checked_out": "გასული",
      "cancelled": "გაუქმებული",
      "no_show": "არ გამოცხადდა"
    },
    "source": {
      "direct": "პირდაპირი",
      "booking_com": "Booking.com",
      "airbnb": "Airbnb",
      "phone": "ტელეფონი",
      "walkin": "ადგილზე"
    },
    "nights": "ღამე",
    "guests": "სტუმარი",
    "totalPrice": "ჯამური ფასი",
    "paidAmount": "გადახდილი",
    "remaining": "დარჩენილი",
    "paymentStatus": {
      "unpaid": "გადაუხდელი",
      "partial": "ნაწილობრივ",
      "paid": "გადახდილი"
    }
  },
  "rooms": {
    "addRoom": "ოთახის დამატება",
    "roomType": {
      "single": "ერთადგილიანი",
      "double": "ორადგილიანი",
      "twin": "ტვინი",
      "family": "საოჯახო",
      "suite": "სუიტა",
      "dorm": "საერთო"
    },
    "pricePerNight": "ფასი ღამეში",
    "maxGuests": "მაქს. სტუმარი",
    "amenities": "კეთილმოწყობა",
    "floor": "სართული"
  },
  "guests": {
    "guestList": "სტუმრების სია",
    "totalStays": "ვიზიტები",
    "totalSpent": "ჯამური ხარჯი",
    "country": "ქვეყანა",
    "language": "ენა"
  },
  "reports": {
    "revenue": "შემოსავალი",
    "occupancyRate": "დატვირთვის მაჩვენებელი",
    "bookingsBySource": "ჯავშნები წყაროს მიხედვით",
    "period": "პერიოდი",
    "thisMonth": "ეს თვე",
    "lastMonth": "წინა თვე",
    "thisYear": "ეს წელი"
  },
  "property": {
    "propertyName": "ობიექტის სახელი",
    "address": "მისამართი",
    "region": "რეგიონი",
    "phone": "ტელეფონი",
    "checkInTime": "ჩასახლების დრო",
    "checkOutTime": "გასვლის დრო",
    "houseRules": "სახლის წესები",
    "taxId": "საიდენტიფიკაციო კოდი"
  },
  "regions": {
    "tbilisi": "თბილისი",
    "kakheti": "კახეთი",
    "imereti": "იმერეთი",
    "adjara": "აჭარა",
    "svaneti": "სვანეთი",
    "mtskheta_mtianeti": "მცხეთა-მთიანეთი",
    "guria": "გურია",
    "samegrelo": "სამეგრელო",
    "racha": "რაჭა",
    "kvemo_kartli": "ქვემო ქართლი",
    "shida_kartli": "შიდა ქართლი",
    "samtskhe_javakheti": "სამცხე-ჯავახეთი"
  },
  "currency": {
    "gel": "₾"
  }
}
```

4. **Dashboard Layout:** Left sidebar (collapsible on mobile) with navigation icons + Georgian labels. Top header with property name, language toggle (KA/EN), and user menu. Main content area.

5. **Design system:** Use shadcn/ui components. Color scheme: Navy (#0D2137) primary, Teal (#117A65) accent, warm neutrals. The UI should feel warm and inviting (Georgian hospitality spirit), not cold corporate SaaS.

6. **Mobile-first:** Many guesthouse owners will use this on phones. Ensure all pages work well on 375px+ width. Sidebar collapses to hamburger menu. Calendar switches to list view on mobile.

---

## PHASE 2: BOOKING CALENDAR + AVAILABILITY ENGINE (Build after Phase 1 works)

### Step 2.1 — Booking Calendar Page

Build a visual booking calendar at `/calendar` using react-big-calendar or a custom implementation:

- **Y-axis:** Rooms (grouped by room type)
- **X-axis:** Dates (scrollable, default showing current week + 2 weeks)
- **Bookings:** Horizontal colored bars spanning check-in to check-out
- **Color coding:**
  - Blue (#2980B9) = confirmed
  - Amber (#F39C12) = pending
  - Green (#27AE60) = checked in
  - Gray (#95A5A6) = checked out
  - Red (#E74C3C) = cancelled
- **Source badges:** Small icon on each bar (B for Booking.com, A for Airbnb, D for Direct)
- **Interactions:**
  - Click empty cell → open "New Booking" modal (pre-filled with room and date)
  - Click booking bar → open booking detail sidebar
  - Drag booking bar edges → modify dates (PATCH /api/bookings/:id/)
- **Mobile:** Switch to a day-by-day list view

### Step 2.2 — New Booking Form

Modal/slide-over form for creating manual bookings:
- Room selection (dropdown, shows price)
- Check-in / Check-out date pickers
- Number of guests
- Guest info (name, phone, email, country — auto-create Guest record)
- Source (dropdown: phone, walk-in, direct)
- Price (auto-calculated from room rate × nights, with manual override)
- Payment method + amount paid
- Notes field
- **Availability check:** Before saving, call the availability API. If room is occupied, show error with the conflicting booking.

### Step 2.3 — Dashboard Page

The main dashboard at `/dashboard` showing:
- **Stat cards row:** Today's check-ins (count), today's check-outs (count), current occupancy (%), this month's revenue (₾)
- **Upcoming arrivals:** Next 7 days, list with guest name, room, check-in date, status
- **Recent bookings:** Last 10 bookings with status, source, amount
- **Quick actions:** "New Booking" button, "Walk-in Check-in" button
- All text in Georgian, numbers formatted with Georgian conventions

---

## PHASE 3: PUBLIC BOOKING PAGE + PAYMENTS (Build after Phase 2)

### Step 3.1 — Public Booking Page

A public-facing page at `/book/:slug` (no auth required, separate layout):
- Property hero image + name (both Georgian and English)
- Available room types with photos, description, price per night
- Date picker for check-in / check-out
- Guest count selector
- Availability results showing matching rooms
- Booking form (guest name, email, phone, country, message)
- Payment via BOG iPay or "Pay at property" option
- Language toggle (KA / EN / RU)
- Mobile-optimized, fast-loading, beautiful design

### Step 3.2 — BOG iPay Integration

Integrate Bank of Georgia's iPay payment gateway:
- Create a payment service class in Django
- On booking submission, create a pending booking and initiate iPay checkout
- Redirect guest to BOG payment page
- Handle callback URL to confirm payment
- Update booking status to confirmed on successful payment
- Handle failed/cancelled payments gracefully

Note: If BOG iPay sandbox is not available yet, create the integration layer with a mock payment service that can be swapped later. The interface should be:
```python
class PaymentService:
    def create_checkout(self, booking_id: UUID, amount_gel: Decimal, return_url: str) -> str:
        """Returns redirect URL to payment page"""
    def verify_payment(self, transaction_id: str) -> PaymentResult:
        """Verifies payment status from callback"""
```

---

## PHASE 4: MESSAGING + AI TRANSLATION (Build after Phase 3)

### Step 4.1 — Messaging UI

A WhatsApp-style messaging page at `/messages`:
- Left panel: conversation list (one per guest, sorted by last message)
- Right panel: chat thread with the selected guest
- Each message shows: text, timestamp, direction (sent/received), language badge
- "Translate" button on each received message → calls OpenAI API
- Quick-reply templates (pre-written messages in multiple languages):
  - Check-in instructions
  - Directions to property
  - WiFi password
  - House rules
  - Thank you message

### Step 4.2 — AI Translation Service

Django service for message translation:
```python
# messaging/services.py
class TranslationService:
    def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        """
        Translate text using OpenAI GPT-4o.
        System prompt should include:
        - Hospitality context (guest communication)
        - Georgian cultural awareness
        - Preserve names, addresses, and numbers
        - Natural, friendly tone
        Supported languages: ka, en, ru, de, tr
        Cache results in Redis (key: hash of text + source + target)
        """
```

---

## PHASE 5: REPORTS + FINAL POLISH (Build last)

### Step 5.1 — Reports Page

Reports page at `/reports` with:
- **Revenue chart:** Line/bar chart showing daily/weekly/monthly revenue in GEL (use recharts)
- **Occupancy chart:** Percentage occupancy over time
- **Bookings by source:** Pie chart (Direct, Booking.com, Airbnb, Phone, Walk-in)
- **Date range filter:** Start/end date pickers
- **Period toggle:** This month / Last month / This year / Custom
- **Export button:** Download as Excel (xlsx) — generate via Django endpoint
- **Tax summary card:** Total revenue, VAT calculation (18%), formatted for RS.ge

### Step 5.2 — Settings Page

Settings page at `/settings`:
- Property details form (name, address, check-in/out times, house rules)
- Room management quick link
- Notification preferences (SMS on/off, email on/off, WhatsApp on/off)
- Language preference
- Account (change password, email)
- Billing / Subscription info

### Step 5.3 — Final Polish

- Loading skeletons on all data-fetching pages
- Empty states with Georgian text and helpful illustrations
- Toast notifications for all actions (save, delete, status change)
- Error boundary with Georgian-language error page
- 404 page in Georgian
- Responsive testing on 375px, 768px, 1024px, 1440px
- Favicon and OG meta tags
- PWA manifest (for "Add to Home Screen" on mobile)

---

## CODING STANDARDS

Follow these throughout all phases:

1. **Python:** Use type hints everywhere. Docstrings on all classes and public methods. Black formatting. isort for imports.
2. **TypeScript:** Strict mode. No `any` types. Interface definitions for all API responses in `types/` directory.
3. **Testing:** Write pytest tests for all booking availability logic (the most critical code). Use factories (factory_boy) for test data.
4. **Git:** Conventional commits (feat:, fix:, chore:). One feature per commit.
5. **Security:** Never expose user data across tenants. Always filter by property owner. Validate all inputs server-side even if frontend validates too.
6. **Performance:** Use `select_related` and `prefetch_related` on all querysets with ForeignKey lookups. Paginate all list endpoints.

---

## START HERE

Begin with Phase 1, Step 1.1. Create the Django project scaffold with all the configuration described above. After the scaffold is ready, create all the models in Step 1.2, then the API layer in Step 1.3, and finally the React frontend in Step 1.4.

After each phase, make sure everything works end-to-end before moving to the next phase. Test the API with curl or Postman before building the frontend pages that consume it.

Let's start building! 🏠
