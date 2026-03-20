import logging

from celery import shared_task

from .models import Booking

logger = logging.getLogger(__name__)


class NotificationService:
    def notify_owner_new_booking(self, booking):
        """Send SMS/WhatsApp to property owner about new booking"""
        # TODO: Implement with Twilio
        logger.info("Owner notification for booking %s", booking.id)

    def notify_guest_confirmation(self, booking):
        """Send email to guest with booking confirmation"""
        # TODO: Implement with SendGrid
        logger.info("Guest confirmation for booking %s", booking.id)


notification_service = NotificationService()


@shared_task
def send_booking_notification(booking_id):
    try:
        booking = Booking.objects.select_related('room', 'property').get(id=booking_id)
    except Booking.DoesNotExist:
        logger.error("Booking %s not found for notification", booking_id)
        return

    logger.info(
        "New booking notification: %s booked %s for %s to %s",
        booking.guest_name,
        booking.room.name_ka,
        booking.check_in,
        booking.check_out,
    )
    logger.info("Owner notification: would send SMS to %s", booking.property.phone)
    logger.info("Guest notification: would send email to %s", booking.guest_email)

    notification_service.notify_owner_new_booking(booking)
    notification_service.notify_guest_confirmation(booking)
