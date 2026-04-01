from django.core.mail import send_mail
from django.conf import settings
from .models import EmailVerificationToken

def send_verification_email(user):
    try:
        # Attempt to retrieve the token associated with this user
        token = user.emailverificationtoken.token
        print(f"Sending email to {user.email} with token: {token}")  # Debugging

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
        print("Email sent successfully")  # Debugging
    except EmailVerificationToken.DoesNotExist:
        print("Verification token does not exist for this user.")
