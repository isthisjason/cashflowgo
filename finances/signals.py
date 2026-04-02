from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from finances.models import Subscription
from finances.utils import send_notification_email

@receiver(post_save, sender=Subscription)
def trigger_email_on_subscription_creation(sender, instance, created, **kwargs):
    if not getattr(settings, "EMAIL_NOTIFICATIONS_ENABLED", False):
        return

    if created:
        subject = f"Subscription Added: {instance.name}"
        message = (
            f"Hi {instance.email},\n\n"
            f"Your subscription to {instance.name} has been added and will expire on {instance.expiry_date}.\n"
            f"Please take note of the expiry date and ensure it is renewed on time.\n\n"
            f"Best regards,\nCashFlowGo Team"
        )
        send_notification_email(subject, message, [instance.email])
