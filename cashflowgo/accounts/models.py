from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)
        extra_fields.setdefault("is_active", True)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if not extra_fields.get("is_staff"):
            raise ValueError("Superuser must have is_staff=True.")
        if not extra_fields.get("is_superuser"):
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    email = models.EmailField(unique=True)
    username = models.CharField(
        max_length=150, unique=True, blank=True, null=True
    )

    personal = models.BooleanField(default=True)
    business = models.BooleanField(default=True)
    family = models.BooleanField(default=True)

    adjusted_income_personal = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    adjusted_income_business = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    adjusted_income_family = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)

    is_active = models.BooleanField(default=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    def save(self, *args, **kwargs):
        if not self.username:
            base_username = self.email.split("@")[0]
            unique_username = base_username
            counter = 1
            while User.objects.filter(username=unique_username).exists():
                unique_username = f"{base_username}{counter}"
                counter += 1
            self.username = unique_username
        super().save(*args, **kwargs)

    def __str__(self):
        return self.email

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["email"], name="unique_email"),
            models.UniqueConstraint(fields=["username"], name="unique_username"),
        ]