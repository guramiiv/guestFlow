# GuestFlow.ge — GitHub Copilot Build Guide
# Step-by-step prompts for Copilot Chat in VS Code

> **How to use this guide:**
> 1. Open VS Code with an empty folder called `guestflow`
> 2. Open Copilot Chat (Ctrl+Shift+I or Cmd+Shift+I)
> 3. Follow each step in order — copy the prompt, paste into Copilot Chat
> 4. Review the generated code, accept or tweak, then move to next step
> 5. After each major section, test before moving on
>
> **Tips for Copilot Chat:**
> - Use `@workspace` prefix when you want Copilot to see your full project
> - Use `#file:filename` to reference specific files
> - If Copilot generates partial code, say "continue" or "finish this file"
> - If output is wrong, say "No, instead do X" — Copilot remembers the conversation
> - For large files, ask Copilot to generate in sections

---

## ═══════════════════════════════════════════
## SECTION 1: BACKEND SETUP (Django)
## ═══════════════════════════════════════════

### STEP 1.1 — Create Django project

Open VS Code terminal first and run:
```bash
mkdir guestflow && cd guestflow
mkdir backend frontend
cd backend
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
pip install django djangorestframework djangorestframework-simplejwt django-cors-headers django-environ django-filter dj-database-url psycopg2-binary celery redis Pillow gunicorn
django-admin startproject config .
```

Then paste this into **Copilot Chat:**

```
Create the Django project configuration for a SaaS called GuestFlow.ge — a guesthouse management platform for Georgian small hotels.

Modify config/settings.py to split into config/settings/base.py, config/settings/development.py, and config/settings/production.py.

base.py should include:
- django-environ for env vars (.env file)
- REST framework with JWT auth (simplejwt), pagination (20/page), and default permission IsAuthenticated
- CORS headers middleware
- Timezone: Asia/Tbilisi
- Language: ka (Georgian) as default, en as secondary
- Installed apps: rest_framework, rest_framework_simplejwt, corsheaders, django_filters, and our custom apps (accounts, properties, bookings, guests, messaging, payments, reports, billing)
- JWT settings: access token 15min, refresh token 7 days
- Database from DATABASE_URL env var with sqlite3 fallback for dev
- Redis CACHES from REDIS_URL env var
- Static files with whitenoise
- Media files config

development.py should:
- Import from base
- DEBUG = True
- CORS_ALLOW_ALL_ORIGINS = True
- Use sqlite3 as default DB

production.py should:
- Import from base
- DEBUG = False
- CORS_ALLOWED_ORIGINS from env
- Strict security settings (HTTPS, HSTS, secure cookies)

Also create .env.example with all required env vars listed.
Also update config/urls.py with api/ prefix and include JWT token URLs at api/auth/token/.
Also update manage.py and wsgi.py to use config.settings.development by default.
```

### STEP 1.2 — Create Django apps

In terminal:
```bash
mkdir apps
cd apps
django-admin startapp accounts
django-admin startapp properties
django-admin startapp bookings
django-admin startapp guests
django-admin startapp messaging
django-admin startapp payments
django-admin startapp reports
django-admin startapp billing
cd ..
touch apps/__init__.py
```

### STEP 1.3 — User model

Paste into **Copilot Chat:**

```
Create the custom User model in apps/accounts/models.py for GuestFlow.ge.

Requirements:
- Extend AbstractUser
- Use email as USERNAME_FIELD (not username)
- Remove username field
- Fields: email (unique), first_name, last_name, phone (CharField 20, blank), language (CharField 2, default='ka', choices: ka/en/ru), is_property_owner (BooleanField default=True)
- Custom manager UserManager that creates users with email instead of username
- __str__ returns email

Also create:
- apps/accounts/admin.py — register with custom admin
- apps/accounts/serializers.py — UserSerializer, RegisterSerializer (email, password, first_name, last_name, phone), LoginSerializer
- apps/accounts/views.py — RegisterView (POST, creates user + empty property), MeView (GET current user, PATCH update)
- apps/accounts/urls.py — register/, me/

The RegisterSerializer should:
1. Create the User
2. Auto-create a Property with name_ka="ჩემი სასტუმრო" (My Guesthouse) and owner=user
3. Return the user data + tokens

Add AUTH_USER_MODEL = 'accounts.User' note for settings.
```

### STEP 1.4 — Property and Room models

Paste into **Copilot Chat:**

```
Create Property and Room models in apps/properties/models.py for GuestFlow.ge.

Property model:
- owner: FK to User (on_delete CASCADE, related_name='properties')
- name_ka: CharField(255) — Georgian name
- name_en: CharField(255, blank=True) — English name
- slug: SlugField(100, unique=True) — auto-generated from name_en or transliterated
- property_type: CharField choices (guesthouse, hotel, apartment, villa), default='guesthouse'
- description_ka: TextField(blank=True)
- description_en: TextField(blank=True)
- address_ka: TextField
- city: CharField(100)
- region: CharField(50) with choices: tbilisi, kakheti, imereti, adjara, svaneti, mtskheta_mtianeti, guria, samegrelo, racha, kvemo_kartli, shida_kartli, samtskhe_javakheti
- latitude: DecimalField(10,8, null=True, blank=True)
- longitude: DecimalField(11,8, null=True, blank=True)
- phone: CharField(20)
- whatsapp: CharField(20, blank=True)
- email: EmailField
- check_in_time: TimeField(default='14:00')
- check_out_time: TimeField(default='12:00')
- house_rules_ka: TextField(blank=True)
- house_rules_en: TextField(blank=True)
- tax_id: CharField(20, blank=True)
- amenities: JSONField(default=list)
- photos: JSONField(default=list)
- plan: CharField choices (starter, pro, business), default='starter'
- is_active: BooleanField(default=True)
- created_at: DateTimeField(auto_now_add)
- updated_at: DateTimeField(auto_now)

Room model:
- property: FK to Property (CASCADE, related_name='rooms')
- name_ka: CharField(100) — e.g., "ოთახი 201"
- name_en: CharField(100, blank=True)
- room_type: CharField choices (single, double, twin, family, suite, dorm)
- max_guests: PositiveIntegerField(default=2)
- base_price_gel: DecimalField(10,2)
- description_ka: TextField(blank=True)
- description_en: TextField(blank=True)
- amenities: JSONField(default=list)
- photos: JSONField(default=list)
- floor: PositiveIntegerField(default=1)
- is_active: BooleanField(default=True)
- sort_order: PositiveIntegerField(default=0)
- created_at, updated_at

SeasonalRate model:
- room: FK to Room (CASCADE, related_name='seasonal_rates')
- name_ka: CharField(100) — e.g., "ზაფხული"
- start_date: DateField
- end_date: DateField
- price_gel: DecimalField(10,2)
- min_stay: PositiveIntegerField(default=1)

Also create:
- apps/properties/admin.py — register all models with useful list_display
- apps/properties/serializers.py — PropertySerializer, PropertyUpdateSerializer, RoomSerializer, RoomCreateSerializer, SeasonalRateSerializer. Room serializer should nest seasonal_rates.
- apps/properties/views.py:
  - PropertyView: GET returns current user's property, PATCH updates it. Use get_object() to always return request.user's property.
  - RoomViewSet: ModelViewSet filtered by user's property. Include seasonal_rates nested.
- apps/properties/urls.py
```

### STEP 1.5 — Booking model (CRITICAL — availability engine)

Paste into **Copilot Chat:**

```
Create Booking and RoomNight models in apps/bookings/models.py for GuestFlow.ge. This is the most critical part of the system — it prevents double-bookings.

RoomNight model (prevents double-bookings at database level):
- room: FK to Room (CASCADE)
- date: DateField
- booking: FK to Booking (CASCADE, related_name='room_nights')
- class Meta: unique_together = ['room', 'date']
  constraints = [UniqueConstraint(fields=['room', 'date'], name='unique_room_night')]

Booking model:
- property: FK to Property (CASCADE, related_name='bookings')
- room: FK to Room (CASCADE, related_name='bookings')
- guest: FK to Guest (SET_NULL, null=True, blank=True, related_name='bookings')
- source: CharField choices (direct, booking_com, airbnb, phone, walkin), default='direct'
- external_id: CharField(100, blank=True)
- status: CharField choices (pending, confirmed, checked_in, checked_out, cancelled, no_show), default='confirmed'
- check_in: DateField
- check_out: DateField
- num_guests: PositiveIntegerField(default=1)
- num_nights: PositiveIntegerField(editable=False)
- total_price_gel: DecimalField(10,2)
- paid_amount_gel: DecimalField(10,2, default=0)
- payment_status: CharField choices (unpaid, partial, paid, refunded), default='unpaid'
- payment_method: CharField choices (cash, bog_ipay, tbc_pay, bank_transfer, channel), blank=True, null=True
- guest_name: CharField(200)
- guest_phone: CharField(20, blank=True)
- guest_email: EmailField(blank=True)
- guest_country: CharField(2, blank=True)
- notes: TextField(blank=True)
- guest_message: TextField(blank=True)
- created_at, updated_at

CRITICAL — Override the save() method:
1. Calculate num_nights = (check_out - check_in).days
2. Validate check_out > check_in
3. If this is a new booking (not updating):
   a. Generate date list from check_in to check_out (exclusive of check_out)
   b. Try to bulk_create RoomNight entries
   c. If IntegrityError (duplicate), raise ValidationError("ოთახი ამ თარიღებში დაკავებულია" — "Room is occupied on these dates")
4. If updating dates on existing booking: delete old RoomNights, create new ones

Add cancel() method:
- Set status to 'cancelled'
- Delete all related RoomNight entries (frees the dates)
- Save

Add class method check_availability(room_id, check_in, check_out):
- Query RoomNight for this room where date >= check_in AND date < check_out
- If any exist, return False + list of occupied dates
- If none exist, return True

Also create:
- apps/bookings/admin.py
- apps/bookings/serializers.py — BookingSerializer, BookingCreateSerializer (validates availability before save), BookingCalendarSerializer (lightweight for calendar view: id, room_id, guest_name, check_in, check_out, status, source)
- apps/bookings/views.py — BookingViewSet with:
  - list: filtered by property, supports ?status=, ?start_date=, ?end_date=, ?source= query params
  - create: validates availability, creates guest if not exists
  - check_in action (POST): changes status to checked_in
  - check_out action (POST): changes status to checked_out
  - cancel action (POST): calls booking.cancel()
  - record_payment action (POST): updates paid_amount and payment_status
  - calendar action (GET): returns BookingCalendarSerializer data for date range
- apps/bookings/urls.py

IMPORTANT: Every queryset must be filtered by property__owner=request.user for multi-tenant security.
```

### STEP 1.6 — Guest model

Paste into **Copilot Chat:**

```
Create Guest model in apps/guests/models.py for GuestFlow.ge.

Guest model:
- property: FK to Property (CASCADE, related_name='guests')
- first_name: CharField(100)
- last_name: CharField(100)
- email: EmailField(blank=True)
- phone: CharField(20, blank=True)
- country: CharField(2, blank=True) — ISO country code
- language: CharField(2, default='en') — preferred language
- id_type: CharField choices (passport, national_id, driving_license), blank=True
- id_number: CharField(50, blank=True)
- total_stays: PositiveIntegerField(default=0)
- total_spent_gel: DecimalField(10,2, default=0)
- notes: TextField(blank=True)
- created_at, updated_at

Properties:
- full_name: returns f"{first_name} {last_name}"

Also create serializers.py, views.py (ModelViewSet filtered by property), urls.py, admin.py.
The list endpoint should support ?search= query param searching across first_name, last_name, email, phone.
The detail endpoint should include recent bookings (last 10) as nested data.
```

### STEP 1.7 — Reports endpoints

Paste into **Copilot Chat:**

```
Create reports API in apps/reports/views.py for GuestFlow.ge.

Create these API views (all filtered by user's property):

1. DashboardView (GET /api/reports/dashboard/):
Returns JSON with:
- today_check_ins: count of bookings with check_in=today and status in (confirmed, checked_in)
- today_check_outs: count of bookings with check_out=today and status=checked_in
- current_occupancy: percentage of rooms occupied tonight (rooms with active RoomNight for today / total active rooms)
- month_revenue: sum of total_price_gel for bookings this month with status not cancelled
- upcoming_arrivals: list of next 7 days' check-ins (guest_name, room name, check_in date, status) — max 10 items
- recent_bookings: last 10 bookings (id, guest_name, room, dates, status, source, total_price_gel)

2. RevenueReportView (GET /api/reports/revenue/?period=month&start=2026-01-01):
Returns daily/weekly/monthly revenue data as array of {date, revenue_gel, bookings_count}

3. OccupancyReportView (GET /api/reports/occupancy/?start=2026-01-01&end=2026-03-31):
Returns daily occupancy data as array of {date, occupancy_percent, rooms_occupied, rooms_total}

Also create urls.py with these endpoints.
```

### STEP 1.8 — Wire up all URLs

Paste into **Copilot Chat:**

```
@workspace Update config/urls.py to include all app URLs under the api/ prefix:

- api/auth/ — include accounts.urls + simplejwt token obtain/refresh views
- api/property/ — include properties.urls (property detail + rooms)
- api/bookings/ — include bookings.urls
- api/guests/ — include guests.urls
- api/reports/ — include reports.urls

Make sure each app's urls.py uses DRF routers where appropriate (ViewSets) and path() for custom views.
```

### STEP 1.9 — Run migrations and test

In terminal:
```bash
python manage.py makemigrations accounts properties bookings guests
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Test with curl:
```bash
# Register
curl -X POST http://localhost:8000/api/auth/register/ -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"TestPass123!","first_name":"გურამი","last_name":"ტესტი","phone":"+995555123456"}'

# Login
curl -X POST http://localhost:8000/api/auth/token/ -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"TestPass123!"}'

# Use the access token for subsequent requests
```

**✅ CHECKPOINT: Backend API should be working. Test all CRUD endpoints before moving to frontend.**

---

## ═══════════════════════════════════════════
## SECTION 2: FRONTEND SETUP (React)
## ═══════════════════════════════════════════

### STEP 2.1 — Create React app

In terminal:
```bash
cd ../frontend
npm create vite@latest . -- --template react-ts
npm install
npm install axios @tanstack/react-query react-router-dom zustand react-i18next i18next tailwindcss @tailwindcss/vite react-hook-form @hookform/resolvers zod date-fns recharts lucide-react
npx shadcn@latest init
npx shadcn@latest add button card input label select dialog sheet table badge tabs toast dropdown-menu separator avatar calendar popover command
```

### STEP 2.2 — Project structure + API client

Paste into **Copilot Chat:**

```
Set up the React project structure for GuestFlow.ge — a Georgian guesthouse management SaaS.

Create these files:

1. src/api/client.ts — Axios instance:
- baseURL from VITE_API_URL env var (default http://localhost:8000/api)
- Request interceptor: attach Authorization Bearer token from localStorage
- Response interceptor: on 401, try to refresh token using /auth/token/refresh/. If refresh fails, clear storage and redirect to /login
- Export the axios instance

2. src/api/auth.ts — Auth API functions:
- register(data): POST /auth/register/
- login(email, password): POST /auth/token/ — store access+refresh in localStorage
- refreshToken(): POST /auth/token/refresh/
- getMe(): GET /auth/me/
- logout(): clear localStorage

3. src/api/rooms.ts — Room API functions:
- getRooms(): GET /rooms/
- getRoom(id): GET /rooms/{id}/
- createRoom(data): POST /rooms/
- updateRoom(id, data): PATCH /rooms/{id}/
- deleteRoom(id): DELETE /rooms/{id}/
- checkAvailability(roomId, startDate, endDate): GET /rooms/{id}/availability/

4. src/api/bookings.ts — Booking API functions:
- getBookings(params): GET /bookings/ (supports status, start_date, end_date, source filters)
- getBooking(id): GET /bookings/{id}/
- createBooking(data): POST /bookings/
- updateBooking(id, data): PATCH /bookings/{id}/
- checkIn(id): POST /bookings/{id}/check_in/
- checkOut(id): POST /bookings/{id}/check_out/
- cancelBooking(id): POST /bookings/{id}/cancel/
- recordPayment(id, data): POST /bookings/{id}/record_payment/
- getCalendarData(startDate, endDate): GET /bookings/calendar/

5. src/api/guests.ts — Guest API functions:
- getGuests(params): GET /guests/ (supports search)
- getGuest(id): GET /guests/{id}/
- updateGuest(id, data): PATCH /guests/{id}/

6. src/api/reports.ts — Report API functions:
- getDashboard(): GET /reports/dashboard/
- getRevenue(period, startDate): GET /reports/revenue/
- getOccupancy(startDate, endDate): GET /reports/occupancy/

7. src/types/index.ts — TypeScript interfaces:
- User { id, email, first_name, last_name, phone, language }
- Property { id, name_ka, name_en, slug, property_type, city, region, phone, ... }
- Room { id, name_ka, name_en, room_type, max_guests, base_price_gel, is_active, seasonal_rates: SeasonalRate[] }
- SeasonalRate { id, name_ka, start_date, end_date, price_gel, min_stay }
- Booking { id, room, guest, source, status, check_in, check_out, num_guests, num_nights, total_price_gel, paid_amount_gel, payment_status, guest_name, ... }
- Guest { id, first_name, last_name, email, phone, country, language, total_stays, total_spent_gel }
- DashboardData { today_check_ins, today_check_outs, current_occupancy, month_revenue, upcoming_arrivals, recent_bookings }
- All fields should match the Django serializer output

8. src/store/authStore.ts — Zustand store:
- user: User | null
- isAuthenticated: boolean
- login(email, password): async
- register(data): async
- logout(): void
- fetchUser(): async

All API functions should use the axios client from client.ts and return typed data.
```

### STEP 2.3 — i18n setup with Georgian translations

Paste into **Copilot Chat:**

```
Set up react-i18next for GuestFlow.ge with Georgian as default language.

Create:

1. src/lib/i18n.ts — i18next configuration:
- Default language: 'ka' (Georgian)
- Fallback language: 'en'
- Interpolation: escapeValue false
- Import and use ka.json and en.json

2. src/locales/ka.json — FULL Georgian translations:
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
    "actions": "მოქმედებები",
    "status": "სტატუსი",
    "date": "თარიღი",
    "total": "ჯამი",
    "noData": "მონაცემები არ მოიძებნა",
    "close": "დახურვა",
    "add": "დამატება",
    "view": "ნახვა",
    "filter": "ფილტრი",
    "export": "ექსპორტი",
    "from": "დან",
    "to": "მდე"
  },
  "auth": {
    "login": "შესვლა",
    "register": "რეგისტრაცია",
    "logout": "გასვლა",
    "email": "ელ. ფოსტა",
    "password": "პაროლი",
    "confirmPassword": "გაიმეორეთ პაროლი",
    "firstName": "სახელი",
    "lastName": "გვარი",
    "phone": "ტელეფონი",
    "welcomeBack": "კეთილი იყოს თქვენი დაბრუნება",
    "createAccount": "ანგარიშის შექმნა",
    "noAccount": "არ გაქვთ ანგარიში?",
    "hasAccount": "უკვე გაქვთ ანგარიში?",
    "loginSuccess": "წარმატებით შეხვედით",
    "registerSuccess": "ანგარიში წარმატებით შეიქმნა"
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
    "title": "მთავარი პანელი",
    "todayCheckIns": "დღევანდელი ჩასახლებები",
    "todayCheckOuts": "დღევანდელი გასვლები",
    "occupancy": "დატვირთვა",
    "monthRevenue": "თვის შემოსავალი",
    "recentBookings": "ბოლო ჯავშნები",
    "upcomingArrivals": "მოსალოდნელი სტუმრები",
    "quickActions": "სწრაფი მოქმედებები",
    "newBooking": "ახალი ჯავშანი",
    "walkIn": "ადგილზე ჩასახლება"
  },
  "bookings": {
    "title": "ჯავშნები",
    "newBooking": "ახალი ჯავშანი",
    "editBooking": "ჯავშნის რედაქტირება",
    "checkIn": "ჩასახლება",
    "checkOut": "გასვლა",
    "cancelBooking": "ჯავშნის გაუქმება",
    "recordPayment": "გადახდის ჩაწერა",
    "room": "ოთახი",
    "guestName": "სტუმრის სახელი",
    "dates": "თარიღები",
    "nights": "ღამე",
    "numGuests": "სტუმრების რაოდენობა",
    "totalPrice": "ჯამური ფასი",
    "paidAmount": "გადახდილი",
    "remaining": "დარჩენილი",
    "selectRoom": "აირჩიეთ ოთახი",
    "selectDates": "აირჩიეთ თარიღები",
    "source": "წყარო",
    "notes": "შენიშვნები",
    "guestMessage": "სტუმრის შეტყობინება",
    "roomOccupied": "ოთახი ამ თარიღებში დაკავებულია",
    "confirmCancel": "ნამდვილად გსურთ ჯავშნის გაუქმება?",
    "status": {
      "pending": "მოლოდინში",
      "confirmed": "დადასტურებული",
      "checked_in": "ჩასახლებული",
      "checked_out": "გასული",
      "cancelled": "გაუქმებული",
      "no_show": "არ გამოცხადდა"
    },
    "source_labels": {
      "direct": "პირდაპირი",
      "booking_com": "Booking.com",
      "airbnb": "Airbnb",
      "phone": "ტელეფონი",
      "walkin": "ადგილზე"
    },
    "payment": {
      "unpaid": "გადაუხდელი",
      "partial": "ნაწილობრივ",
      "paid": "გადახდილი",
      "refunded": "დაბრუნებული",
      "method": "გადახდის მეთოდი",
      "cash": "ნაღდი",
      "bog_ipay": "BOG iPay",
      "tbc_pay": "TBC Pay",
      "bank_transfer": "საბანკო გადარიცხვა",
      "channel": "არხით"
    }
  },
  "rooms": {
    "title": "ოთახები",
    "addRoom": "ოთახის დამატება",
    "editRoom": "ოთახის რედაქტირება",
    "roomName": "ოთახის სახელი",
    "roomType": "ოთახის ტიპი",
    "pricePerNight": "ფასი ღამეში",
    "maxGuests": "მაქს. სტუმარი",
    "amenities": "კეთილმოწყობა",
    "floor": "სართული",
    "seasonalRates": "სეზონური ფასები",
    "types": {
      "single": "ერთადგილიანი",
      "double": "ორადგილიანი",
      "twin": "ტვინი",
      "family": "საოჯახო",
      "suite": "სუიტა",
      "dorm": "საერთო"
    }
  },
  "guests": {
    "title": "სტუმრები",
    "guestList": "სტუმრების სია",
    "searchGuests": "სტუმრის ძიება...",
    "totalStays": "ვიზიტები",
    "totalSpent": "ჯამური ხარჯი",
    "country": "ქვეყანა",
    "language": "ენა",
    "bookingHistory": "ჯავშნების ისტორია",
    "idDocument": "პირადობის დოკუმენტი"
  },
  "reports": {
    "title": "ანგარიშები",
    "revenue": "შემოსავალი",
    "occupancyRate": "დატვირთვის მაჩვენებელი",
    "bookingsBySource": "ჯავშნები წყაროს მიხედვით",
    "period": "პერიოდი",
    "thisMonth": "ეს თვე",
    "lastMonth": "წინა თვე",
    "thisYear": "ეს წელი",
    "custom": "მორგებული",
    "taxSummary": "საგადასახადო შეჯამება",
    "totalRevenue": "ჯამი შემოსავალი",
    "vat": "დღგ (18%)",
    "exportExcel": "Excel-ში ექსპორტი"
  },
  "property": {
    "title": "ობიექტის პარამეტრები",
    "propertyName": "ობიექტის სახელი",
    "address": "მისამართი",
    "region": "რეგიონი",
    "phone": "ტელეფონი",
    "whatsapp": "WhatsApp",
    "checkInTime": "ჩასახლების დრო",
    "checkOutTime": "გასვლის დრო",
    "houseRules": "სახლის წესები",
    "taxId": "საიდენტიფიკაციო კოდი",
    "description": "აღწერა"
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
  }
}

3. src/locales/en.json — English translations (same structure, English values)

4. Import and initialize i18n in src/main.tsx before React renders
```

### STEP 2.4 — Layout + Router

Paste into **Copilot Chat:**

```
Create the app layout and router for GuestFlow.ge.

1. src/router.tsx — React Router configuration:
- Public routes (no auth): /login, /register, /book/:slug
- Protected routes (require auth): /dashboard, /calendar, /bookings, /bookings/:id, /rooms, /guests, /guests/:id, /reports, /settings
- Default redirect: / → /dashboard (if authed) or /login (if not)
- ProtectedRoute wrapper that checks auth state

2. src/components/layout/DashboardLayout.tsx:
- Left sidebar (240px wide, collapsible on mobile via hamburger):
  - GuestFlow.ge logo at top (text logo, navy color)
  - Nav items with icons (use lucide-react): Dashboard (LayoutDashboard), Calendar (CalendarDays), Bookings (BookOpen), Rooms (BedDouble), Guests (Users), Messages (MessageCircle), Reports (BarChart3), Settings (Settings)
  - Each nav item shows Georgian label from i18n
  - Active item highlighted with teal background
  - Bottom: user email + logout button
- Top header:
  - Property name (Georgian)
  - Language toggle button (KA / EN)
  - Notification bell icon
  - User avatar dropdown
- Main content area with padding
- Mobile: sidebar becomes a slide-over sheet

Color scheme:
- Sidebar background: #0D2137 (navy)
- Sidebar text: white, active item: #117A65 (teal) bg with white text
- Header: white bg with bottom border
- Content area: #F8F9FA background
- Accent color: #117A65 (teal)
- Use Tailwind classes throughout

3. src/components/shared/CurrencyDisplay.tsx:
- Takes amount (number) and displays as ₾1,250.00
- Uses Georgian number formatting

4. src/components/shared/StatusBadge.tsx:
- Takes status string and returns colored badge
- confirmed: blue, pending: amber, checked_in: green, checked_out: gray, cancelled: red, no_show: red

5. src/components/shared/DateDisplay.tsx:
- Takes date string and formats as DD.MM.YYYY

6. src/App.tsx — wrap with QueryClientProvider, BrowserRouter, and i18n provider
```

### STEP 2.5 — Dashboard page

Paste into **Copilot Chat:**

```
Create the Dashboard page for GuestFlow.ge at src/pages/dashboard/DashboardPage.tsx.

Use TanStack Query to fetch data from GET /api/reports/dashboard/

Layout:
1. Top row — 4 stat cards in a grid (2 cols on mobile, 4 on desktop):
   - "დღევანდელი ჩასახლებები" (Today's Check-ins): number with blue icon
   - "დღევანდელი გასვლები" (Today's Check-outs): number with orange icon
   - "დატვირთვა" (Occupancy): percentage with green icon and progress bar
   - "თვის შემოსავალი" (Month Revenue): GEL amount with teal icon

2. Two-column layout below (stacks on mobile):
   Left: "მოსალოდნელი სტუმრები" (Upcoming Arrivals) card:
   - List of next arrivals with guest_name, room, check_in date, status badge
   - Max 8 items
   - Each row clickable → navigates to booking detail

   Right: "ბოლო ჯავშნები" (Recent Bookings) card:
   - Table with columns: guest, room, dates, source badge, status badge, amount
   - Max 10 items
   - Source badges: small colored pills (Booking.com=blue, Airbnb=red, Direct=teal, Phone=gray)

3. Quick action buttons at the bottom:
   - "ახალი ჯავშანი" (New Booking) → opens booking form
   - "ადგილზე ჩასახლება" (Walk-in) → opens booking form with source=walkin

Use loading skeletons while data is fetching.
Use shadcn/ui Card, Table, Badge components.
All text from i18n translations (useTranslation hook).
Currency displayed with ₾ symbol.
```

### STEP 2.6 — Rooms page

Paste into **Copilot Chat:**

```
Create the Rooms management page for GuestFlow.ge at src/pages/rooms/RoomsPage.tsx.

Features:
1. Header with "ოთახები" title and "ოთახის დამატება" (Add Room) button

2. Room cards in a grid (1 col mobile, 2 cols tablet, 3 cols desktop):
   Each card shows:
   - Room photo (or placeholder with bed icon)
   - Room name (Georgian)
   - Room type badge (translated)
   - Price per night in ₾
   - Max guests with person icon
   - Floor number
   - Active/inactive toggle
   - Edit and Delete buttons
   - Seasonal rates summary (if any)

3. Add/Edit Room dialog (shadcn Sheet or Dialog):
   - Form fields: name_ka, name_en, room_type (select), max_guests, base_price_gel, floor, description_ka, amenities (multi-select checkboxes: WiFi, პარკინგი, კონდიციონერი, აივანი, სამზარეულო, TV, მინიბარი)
   - Seasonal rates section: add/remove rate rows (name, start_date, end_date, price_gel, min_stay)
   - Save button calls createRoom or updateRoom
   - Use react-hook-form + zod validation

Use TanStack Query with optimistic updates on toggle active/delete.
```

### STEP 2.7 — Bookings list + create form

Paste into **Copilot Chat:**

```
Create the Bookings page for GuestFlow.ge at src/pages/bookings/BookingsPage.tsx.

1. Header: "ჯავშნები" title + "ახალი ჯავშანი" button + filter row
   Filters: status dropdown, source dropdown, date range picker

2. Bookings table:
   Columns: guest name, room, check-in, check-out, nights, source badge, status badge, total ₾, paid ₾, actions
   Actions dropdown: Check-in, Check-out, Cancel, Record Payment, View Details
   Clicking a row navigates to /bookings/:id

3. New Booking Sheet (slide-over from right):
   Form with:
   - Room select (shows room name + price)
   - Check-in date picker
   - Check-out date picker
   - Auto-calculated: nights count and total price
   - Number of guests
   - Guest name (required)
   - Guest phone
   - Guest email
   - Guest country (select)
   - Source (select: phone, walk-in, direct)
   - Payment method (select)
   - Amount paid (number input, default 0)
   - Notes (textarea)

   On submit:
   - POST /api/bookings/
   - If 400 (room occupied), show error toast in Georgian
   - On success, show success toast, close sheet, refetch bookings

4. Record Payment Dialog:
   - Shows booking total and paid amount
   - Input for new payment amount
   - Payment method select
   - On submit: POST /api/bookings/:id/record_payment/

Use shadcn Table, Sheet, Dialog, Select, Calendar components.
All labels from i18n.
```

### STEP 2.8 — Booking Calendar

Paste into **Copilot Chat:**

```
Create the Calendar page for GuestFlow.ge at src/pages/bookings/CalendarPage.tsx.

Build a custom booking calendar (timeline/Gantt-style):
- Y-axis: rooms (from GET /api/rooms/)
- X-axis: dates (scrollable, showing 14 days by default)
- Each booking appears as a horizontal colored bar spanning its dates

Implementation:
- Use a CSS Grid or Table layout
- Date headers at top (DD.MM format, highlight today)
- Room names on left column (sticky)
- Booking bars positioned absolutely within each room row
- Bar colors by status: confirmed=#2980B9, pending=#F39C12, checked_in=#27AE60, checked_out=#95A5A6, cancelled=#E74C3C
- Bar shows guest_name text (truncated if needed)
- Small source icon on each bar
- Click bar → show booking detail in a popover/sheet
- Click empty cell → open new booking form pre-filled with that room and date
- Navigation: Previous/Next week buttons, "Today" button, date picker to jump

Mobile view: switch to a simple daily list view (select date → show all bookings for that day)

Fetch data from GET /api/bookings/calendar/?start=YYYY-MM-DD&end=YYYY-MM-DD
Also fetch rooms from GET /api/rooms/

This is a complex component — break it into:
- CalendarPage.tsx (page wrapper, data fetching)
- CalendarGrid.tsx (the grid layout)
- CalendarBar.tsx (individual booking bar)
- CalendarControls.tsx (navigation, date picker)
- CalendarDayView.tsx (mobile list view)
```

### STEP 2.9 — Guest pages

Paste into **Copilot Chat:**

```
Create Guest pages for GuestFlow.ge:

1. src/pages/guests/GuestsPage.tsx:
- Search bar at top (searches by name, email, phone)
- Guests table: name, email, phone, country flag, total stays, total spent ₾, last visit date
- Click row → navigate to /guests/:id

2. src/pages/guests/GuestDetailPage.tsx:
- Guest info card: full name, email, phone, country, language, ID info, notes
- Edit button → inline edit mode
- Stats row: total stays, total spent ₾, average per stay
- Booking history table: list of all bookings (date, room, nights, amount, status)
```

### STEP 2.10 — Reports page

Paste into **Copilot Chat:**

```
Create Reports page for GuestFlow.ge at src/pages/reports/ReportsPage.tsx.

Use recharts library for charts. All in Georgian.

Layout:
1. Period selector row: buttons for "ეს თვე", "წინა თვე", "ეს წელი", "მორგებული" (custom date range)

2. Revenue chart card:
   - Title: "შემოსავალი" (Revenue)
   - Bar chart showing daily/monthly revenue in ₾
   - Tooltip shows date + revenue amount
   - Total revenue number displayed prominently

3. Occupancy chart card:
   - Title: "დატვირთვის მაჩვენებელი" (Occupancy Rate)
   - Line chart showing occupancy % over time
   - Average occupancy displayed

4. Bookings by source card:
   - Title: "ჯავშნები წყაროს მიხედვით"
   - Pie chart: Direct, Booking.com, Airbnb, Phone, Walk-in
   - Legend with counts and percentages

5. Tax summary card:
   - Total revenue
   - VAT 18% calculation
   - Net revenue
   - "Excel-ში ექსპორტი" (Export to Excel) button

Charts should use teal (#117A65) as primary color, navy (#0D2137) as secondary.
Responsive: charts stack vertically on mobile.
```

---

## ═══════════════════════════════════════════
## SECTION 3: CONNECT & TEST
## ═══════════════════════════════════════════

### STEP 3.1 — Connect frontend to backend

```
@workspace Make sure the React frontend connects to the Django backend:

1. Add VITE_API_URL=http://localhost:8000/api to frontend .env
2. Verify CORS is properly configured in Django for localhost:5173
3. Test the full flow:
   - Register → should create user + property
   - Login → should get JWT tokens
   - Dashboard → should load (empty data is fine)
   - Create a room → should appear in rooms list
   - Create a booking → should appear in calendar and bookings list
   - Check-in → status should update

Fix any connection issues, CORS errors, or serialization mismatches.
```

### STEP 3.2 — Seed data for testing

Paste into **Copilot Chat:**

```
Create a Django management command at apps/bookings/management/commands/seed_data.py that:

1. Creates a test user (email: demo@guestflow.ge, password: Demo123!)
2. Creates a property:
   - name_ka: "კახური სასტუმრო სახლი"
   - name_en: "Kakhetian Guest House"
   - region: kakheti
   - city: Sighnaghi
3. Creates 5 rooms:
   - "ოთახი 101" single ₾80
   - "ოთახი 102" double ₾120
   - "ოთახი 201" double ₾130
   - "ოთახი 202" family ₾180
   - "სუიტა" suite ₾250
4. Creates 15 bookings spread across the current month:
   - Mix of sources (direct, booking_com, airbnb, phone)
   - Mix of statuses (confirmed, checked_in, checked_out)
   - Random guest names (mix of Georgian and international)
   - Realistic prices
5. Creates Guest records for each booking

Run with: python manage.py seed_data
```

---

## TIPS FOR COPILOT CHAT

1. **When Copilot truncates output:** Type "continue from where you stopped" or "finish the file"
2. **When code has errors:** Copy the error message and paste it: "I'm getting this error: [error]. Fix it."
3. **To reference existing files:** Use "#file:src/api/client.ts" to include file context
4. **For multi-file changes:** Use "@workspace" prefix so Copilot sees the whole project
5. **When stuck:** Ask "What files do I need to create/modify for [feature]?"
6. **For Georgian text:** Copy-paste Georgian strings from this guide — don't ask Copilot to generate Georgian text, it may be inaccurate
7. **Test often:** After each major step, run both backend and frontend and test the feature before moving on

---

## AFTER MVP IS BUILT — NEXT PRIORITIES

1. Public booking page (/book/:slug) with BOG iPay payment
2. AI message translation (OpenAI integration)
3. Booking.com channel manager integration
4. Landing page in Georgian for marketing
5. Mobile PWA optimization
6. Deploy to Vercel + Railway
