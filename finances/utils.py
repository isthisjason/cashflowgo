from django.apps import apps
from django.core.mail import send_mail
from django.conf import settings
from finances.models import Subscription
from datetime import date, timedelta
import logging

logger = logging.getLogger(__name__)

def validate_user_profile(user, profile_name):
    """
    Validates whether the given profile belongs to the user.
    """
    Profile = apps.get_model('dashboard', 'Profile')  # Dynamically load the Profile model
    try:
        # Check if the profile belongs to the logged-in user
        return Profile.objects.filter(user=user, name=profile_name).exists()
    except Profile.DoesNotExist:
        return False
    
def send_notification_email(subject, message, recipient_list):
    if not getattr(settings, "EMAIL_NOTIFICATIONS_ENABLED", False):
        logger.info("Email notifications disabled; skipping email send")
        return
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            recipient_list,
            fail_silently=False,
        )
        logger.info("Notification email sent recipient_count=%s", len(recipient_list))
    except Exception as e:
        logger.exception("Notification email failed")

def process_subscription_reminders():
    if not getattr(settings, "EMAIL_NOTIFICATIONS_ENABLED", False):
        logger.info("Email notifications disabled; skipping subscription reminders")
        return

    today = date.today()
    subscriptions = Subscription.objects.filter(
        expiry_date__gte=today,
        expiry_date__lte=today + timedelta(days=30)
    )

    logger.info("Processing subscription reminders count=%s", subscriptions.count())

    for subscription in subscriptions:
        if subscription.is_reminder_due():
            subject = f"Subscription Reminder: {subscription.name}"
            message = (
                f"Hi {subscription.user.email},\n\n"
                f"Your subscription to {subscription.name} will expire on {subscription.expiry_date}.\n"
                f"Please take action to renew it.\n\n"
                f"Best regards,\nCashFlowGo Team"
            )
            try:
                send_notification_email(subject, message, [subscription.user.email])
                logger.info("Subscription reminder sent subscription_id=%s", subscription.id)
            except Exception as e:
                logger.exception("Subscription reminder failed subscription_id=%s", subscription.id)
