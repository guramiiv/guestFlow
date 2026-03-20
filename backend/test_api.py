"""Quick test script for the GuestFlow API endpoints."""
from urllib.request import Request, urlopen
from urllib.error import HTTPError
import json


def api(method, path, token=None, data=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode() if data else None
    req = Request(f"http://localhost:8000/api{path}", data=body, headers=headers, method=method)
    try:
        resp = urlopen(req)
        return resp.status, json.loads(resp.read().decode())
    except HTTPError as e:
        return e.code, json.loads(e.read().decode())


# 1. Login
status, tokens = api("POST", "/auth/token/", data={"email": "test@guestflow.ge", "password": "TestPass123!"})
assert status == 200, f"Login failed: {tokens}"
token = tokens["access"]
print(f"1. LOGIN: OK (token={token[:20]}...)")

# 2. Me
status, me = api("GET", "/auth/me/", token)
assert status == 200, f"Me failed: {me}"
print(f"2. ME: OK ({me['email']})")

# 3. Dashboard
status, dash = api("GET", "/reports/dashboard/", token)
assert status == 200, f"Dashboard failed: {dash}"
print(f"3. DASHBOARD: OK (check_ins={dash['today_check_ins']}, occupancy={dash['current_occupancy']})")

# 4. Create Room
status, room = api("POST", "/property/rooms/", token, {
    "name_ka": "ტესტი 201", "name_en": "Test 201", "room_type": "double",
    "max_guests": 2, "base_price_gel": "150.00", "floor": 2, "is_active": True, "amenities": ["wifi"],
})
assert status == 201, f"Room creation failed: {room}"
room_id = room["id"]
print(f"4. CREATE ROOM: OK (id={room_id}, name={room['name_ka']})")

# 5. List Rooms
status, rooms = api("GET", "/property/rooms/", token)
assert status == 200 and rooms["count"] > 0, f"Rooms list failed: {rooms}"
print(f"5. LIST ROOMS: OK (count={rooms['count']})")

# 6. Create Booking (with total_price_gel calculated: 3 nights * 150 = 450)
status, booking = api("POST", "/bookings/", token, {
    "room": room_id, "check_in": "2026-05-10", "check_out": "2026-05-13",
    "num_guests": 2, "guest_name": "Nino Test", "guest_phone": "+995551112233",
    "guest_email": "nino@test.ge", "guest_country": "GE", "source": "direct",
    "payment_method": "cash", "total_price_gel": "450.00", "paid_amount_gel": "0.00",
})
assert status == 201, f"Booking creation failed ({status}): {booking}"
bid = booking["id"]
print(f"6. CREATE BOOKING: OK (id={bid}, total={booking['total_price_gel']}, status={booking['status']})")

# 7. Check-in
status, ci = api("POST", f"/bookings/{bid}/check_in/", token, {})
assert status == 200, f"Check-in failed: {ci}"
print(f"7. CHECK-IN: OK (status={ci['status']})")

# 8. Calendar
status, cal = api("GET", "/bookings/calendar/?start=2026-05-01&end=2026-05-31", token)
assert status == 200, f"Calendar failed: {cal}"
print(f"8. CALENDAR: OK ({len(cal)} bookings)")

# 9. Guests
status, guests = api("GET", "/guests/", token)
assert status == 200, f"Guests failed: {guests}"
print(f"9. GUESTS: OK (count={guests['count']})")

# 10. Check-out
status, co = api("POST", f"/bookings/{bid}/check_out/", token, {})
assert status == 200, f"Check-out failed: {co}"
print(f"10. CHECK-OUT: OK (status={co['status']})")

# 11. Revenue report
status, rev = api("GET", "/reports/revenue/?period=month&start=2026-03-01", token)
assert status == 200, f"Revenue failed: {rev}"
print(f"11. REVENUE: OK ({len(rev)} data points)")

# 12. Occupancy report
status, occ = api("GET", "/reports/occupancy/?start=2026-05-01&end=2026-05-31", token)
assert status == 200, f"Occupancy failed: {occ}"
print(f"12. OCCUPANCY: OK ({len(occ)} data points)")

print("\n=== ALL 12 TESTS PASSED ===")
