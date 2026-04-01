from django.core.mail import send_mail
from django.conf import settings
from .models import EmailVerificationToken
import logging

logger = logging.getLogger(__name__)

def send_verification_email(user):
    try:
        # Attempt to retrieve the token associated with this user
        token = user.emailverificationtoken.token

        subject = "Verify Your Email for CashFlowGo"
        message = f"""
        Hi {user.username},

        Thank you for signing up! Please verify your email by clicking on the link below:

        {settings.SITE_URL}/accounts/verify/{token}

        If you didn’t create this account, you can safely ignore this email.

        Best regards,
        The CashFlowGo Team
        """
        send_mail(
            subject,
            message,
            settings.EMAIL_HOST_USER,
            [user.email],
            fail_silently=False,
        )
        logger.info("Verification email sent user_id=%s", user.id)
    except EmailVerificationToken.DoesNotExist:
        logger.warning("Verification token missing user_id=%s", user.id)
