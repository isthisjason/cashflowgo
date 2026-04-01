from django.apps import apps
from django.core.mail import send_mail
from django.conf import settings
from finances.models import Subscription
from datetime import date, timedelta

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
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            recipient_list,
            fail_silently=False,  # Set to False to debug email failures
        )
        print(f"Email sent to {recipient_list}")
    except Exception as e:
        print(f"Error sending email: {e}")

def process_subscription_reminders():
    today = date.today()
    subscriptions = Subscription.objects.filter(
        expiry_date__gte=today,
        expiry_date__lte=today + timedelta(days=30)
    )

    print(f"Found {subscriptions.count()} subscriptions for reminders.")

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
                print(f"Email sent to {subscription.user.email} for subscription {subscription.name}.")
            except Exception as e:
                print(f"Error sending email to {subscription.user.email}: {e}")