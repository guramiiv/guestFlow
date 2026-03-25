"""Seed test data: rooms of all types + bookings of all statuses."""
import os, sys, django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

from apps.properties.models import Property, Room
from apps.bookings.models import Booking, RoomNight
from datetime import date, timedelta
from decimal import Decimal

prop = Property.objects.get(id=1)
today = date.today()

# ── Clean existing bookings + room nights ─────────────────────
old_count = Booking.objects.filter(property=prop).count()
RoomNight.objects.filter(booking__property=prop).delete()
Booking.objects.filter(property=prop).delete()
print(f"Cleared {old_count} old bookings\n")

# ── Create rooms (all types) ──────────────────────────────────
room_defs = [
    {
        "name_ka": "Double Deluxe 201",
        "name_en": "Double Deluxe 201",
        "room_type": "double",
        "max_guests": 2,
        "base_price_gel": Decimal("180.00"),
        "floor": 2,
        "amenities": ["wifi", "ac", "tv", "minibar", "balcony"],
        "description_ka": "Spacious double room with mountain view",
        "description_en": "Spacious double room with mountain view",
    },
    {
        "name_ka": "Family Suite 301",
        "name_en": "Family Suite 301",
        "room_type": "family",
        "max_guests": 4,
        "base_price_gel": Decimal("350.00"),
        "floor": 3,
        "amenities": ["wifi", "ac", "tv", "kitchen", "balcony", "heating"],
        "description_ka": "Large family suite with kitchen",
        "description_en": "Large family suite with kitchen",
    },
    {
        "name_ka": "Premium Suite 302",
        "name_en": "Premium Suite 302",
        "room_type": "suite",
        "max_guests": 3,
        "base_price_gel": Decimal("450.00"),
        "floor": 3,
        "amenities": ["wifi", "ac", "tv", "minibar", "balcony", "heating", "garden"],
        "description_ka": "Luxury suite with panoramic views",
        "description_en": "Luxury suite with panoramic views",
    },
    {
        "name_ka": "Dorm Room 101",
        "name_en": "Dorm Room 101",
        "room_type": "dorm",
        "max_guests": 6,
        "base_price_gel": Decimal("45.00"),
        "floor": 1,
        "amenities": ["wifi", "heating"],
        "description_ka": "Budget dormitory room",
        "description_en": "Budget dormitory room",
    },
]

for rd in room_defs:
    r, created = Room.objects.get_or_create(
        property=prop,
        name_en=rd["name_en"],
        defaults={**rd, "is_active": True, "photos": []},
    )
    tag = "CREATED" if created else "EXISTS"
    print(f"  Room [{r.id}] {r.name_en} ({r.room_type}) - {tag}")

# Reload all active rooms
all_rooms = list(Room.objects.filter(property=prop, is_active=True).order_by("id"))
print(f"\nTotal active rooms: {len(all_rooms)}")
for i, r in enumerate(all_rooms):
    print(f"  [{i}] id={r.id} {r.name_en} ({r.room_type})")

# ── Helper to create a booking ────────────────────────────────
def make_booking(room_idx, guest_name, ci_offset, co_offset, status,
                 source="direct", num_guests=1, payment_method="",
                 notes="", guest_email="", guest_phone="",
                 guest_country="", cancellation_reason="",
                 force_paid=None, force_partial_amount=None):
    room = all_rooms[room_idx]
    ci = today + timedelta(days=ci_offset)
    co = today + timedelta(days=co_offset)
    num_nights = (co - ci).days
    price = room.base_price_gel * num_nights

    # Payment logic
    if force_partial_amount is not None:
        paid = force_partial_amount
        pay_status = "partial"
    elif force_paid is not None:
        paid = force_paid
        pay_status = "paid" if paid >= price else ("partial" if paid > 0 else "unpaid")
    elif status in ("checked_out", "checked_in"):
        paid = price
        pay_status = "paid"
    else:
        paid = Decimal("0")
        pay_status = "unpaid"

    # For cancelled bookings, save without triggering RoomNight creation
    b = Booking(
        property=prop, room=room,
        check_in=ci, check_out=co,
        num_guests=num_guests, num_nights=num_nights,
        total_price_gel=price, paid_amount_gel=paid,
        payment_status=pay_status, payment_method=payment_method,
        source=source, status=status,
        guest_name=guest_name, guest_email=guest_email,
        guest_phone=guest_phone, guest_country=guest_country,
        notes=notes, cancellation_reason=cancellation_reason,
    )
    b.save()

    print(
        f"  [{b.id:>3}] {guest_name:<22} | {status:<12} | {ci} -> {co} "
        f"| {num_nights}n | {room.name_en:<20} | GEL {price:>8} | pay={pay_status}"
    )
    return b


# ── Create bookings ───────────────────────────────────────────
print("\n-- CONFIRMED (upcoming) --")
make_booking(0, "John Smith",        2,  5,  "confirmed", "direct",      1, "cash",         "Arriving late, around 10pm", "john@example.com", "+44712345678", "GB")
make_booking(1, "Anna Mueller",      1,  4,  "confirmed", "booking_com", 2, "bog_ipay",     "", "anna.m@gmail.com", "+491701234567", "DE")
make_booking(0, "Nino Kvaratskhelia",10, 14, "confirmed", "direct",      1, "tbc_pay",      "Returning guest", "nino.k@gmail.com", "+995555123456", "GE")
make_booking(3, "Marco Rossi",       8, 12,  "confirmed", "direct",      3, "",             "Honeymoon trip", "marco.r@libero.it", "+393331234567", "IT")

print("\n-- PENDING --")
make_booking(2, "Marie Dupont",      3,  7,  "pending",   "airbnb",      2, "",             "Need airport transfer", "marie.d@yahoo.fr", "+33612345678", "FR")
make_booking(3, "Luka Beridze",      14, 17, "pending",   "phone",       3, "cash",         "", "luka.b@gmail.com", "+995591234567", "GE")

print("\n-- CHECKED IN (currently staying) --")
make_booking(4, "Yuki Tanaka",      -1,  3,  "checked_in","direct",      2, "bog_ipay",     "Vegetarian breakfast please", "yuki.t@mail.jp", "+819012345678", "JP")
make_booking(5, "Carlos Garcia",    -2,  1,  "checked_in","walkin",      1, "cash",         "", "carlos@hotmail.com", "+34612345678", "ES")

print("\n-- CHECKED OUT (past) --")
make_booking(0, "Sarah Johnson",    -10, -5, "checked_out","booking_com", 1, "bank_transfer","Great stay, will come back", "sarah.j@outlook.com", "+12025551234", "US")
make_booking(2, "David Kim",        -14, -8, "checked_out","airbnb",      2, "bog_ipay",     "", "david.k@gmail.com", "+821012345678", "KR")
make_booking(3, "Elena Petrova",    -18,-12, "checked_out","direct",      4, "cash",         "Family trip", "elena.p@yandex.ru", "+79161234567", "RU")
make_booking(1, "Tom Wilson",       -5, -2,  "checked_out","booking_com", 2, "tbc_pay",      "", "tom.w@gmail.com", "+353871234567", "IE")

print("\n-- CANCELLED --")
make_booking(1, "James Brown",       4,  7,  "cancelled", "booking_com", 2, "",             "", "james.b@gmail.com", "+447891234567", "GB", "Flight cancelled due to weather")
make_booking(4, "Lisa Wang",         6, 10,  "cancelled", "airbnb",      1, "",             "", "lisa.w@qq.com", "+8613812345678", "CN", "Changed travel plans")

print("\n-- NO SHOW --")
make_booking(1, "Ahmed Hassan",     -20,-18, "no_show",   "phone",       2, "cash",         "", "ahmed.h@gmail.com", "+201012345678", "EG")

print("\n-- PARTIALLY PAID --")
make_booking(2, "Sophie Martin",     15, 19, "confirmed", "booking_com", 2, "bog_ipay",     "Paid deposit online", "sophie.m@gmail.com", "+33698765432", "FR",
             force_partial_amount=Decimal("200.00"))

print("\n-- FULLY PAID BUT UPCOMING --")
make_booking(5, "Michael Chen",      5,  8,  "confirmed", "direct",      2, "bog_ipay",     "Prepaid in full", "michael.c@gmail.com", "+8521234567", "HK",
             force_paid=Decimal("45.00") * 3)

# ── Summary ───────────────────────────────────────────────────
total = Booking.objects.filter(property=prop).count()
print(f"\n{'='*70}")
print(f"Done! Total bookings: {total}")
print(f"Total rooms: {Room.objects.filter(property=prop, is_active=True).count()}")
print(f"\nBreakdown:")
for s in ["confirmed", "pending", "checked_in", "checked_out", "cancelled", "no_show"]:
    c = Booking.objects.filter(property=prop, status=s).count()
    print(f"  {s:<14} {c}")
