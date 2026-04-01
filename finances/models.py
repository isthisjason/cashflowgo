from django.db import models
from django.conf import settings
from datetime import date, timedelta
from django.utils.timezone import now
import hashlib

import hashlib

class Transaction(models.Model):
    TRANSACTION_TYPES = [
        ('Income', 'Income'),
        ('Expense', 'Expense'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='transactions'  # This enables user.transactions
    )
    profile_type = models.CharField(
        max_length=10,
        choices=[
            ('personal', 'Personal'),
            ('business', 'Business'),
            ('family', 'Family'),
        ],
        default='personal'  # Match Budget model default
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=100, default="Uncategorized")
    date = models.DateField()
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    unique_hash = models.CharField(max_length=32, unique=True, blank=True, null=True)

    def __str__(self):
        return f"{self.transaction_type}: {self.amount} on {self.date}"

    def save(self, *args, **kwargs):
        # Normalize amount to ensure consistent formatting
        normalized_amount = f"{float(self.amount):.2f}"  # Always two decimal places
        hash_input = f"{normalized_amount}{self.category}{self.date}{self.profile_type}{self.user.id}"
        self.unique_hash = hashlib.md5(hash_input.encode()).hexdigest()
        super().save(*args, **kwargs)

class Budget(models.Model):
    PROFILE_CHOICES = [
        ('personal', 'Personal'),
        ('business', 'Business'),
        ('family', 'Family'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='budgets'
    )
    profile_type = models.CharField(
        max_length=10,
        choices=PROFILE_CHOICES,
        default='personal'
    )
    email = models.EmailField(default="placeholder@example.com")  # Default email for existing rows
    monthly_limit = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)  # Automatically set at creation
    updated_at = models.DateTimeField(auto_now=True)  # Automatically updated on save

    def calculate_current_spending(self):
        """
        Calculate the current spending for the month by summing transactions for this profile.
        """
        today = date.today()
        first_day = today.replace(day=1)
        transactions = self.user.transactions.filter(
            transaction_type='Expense',
            date__gte=first_day,
            date__lte=today,
            profile_type=self.profile_type
        )
        print("Transactions retrieved for spending calculation:", transactions)  # Debug log
        return sum(transaction.amount for transaction in transactions)

    def __str__(self):
        return f"{self.user.email} - {self.profile_type} Budget"
    
    def is_over_budget(self):
        current_spending = self.calculate_current_spending()
        return current_spending > self.monthly_limit
    
class Subscription(models.Model):
    PROFILE_CHOICES = [
        ('personal', 'Personal'),
        ('business', 'Business'),
        ('family', 'Family'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='subscriptions')
    profile_type = models.CharField(
        max_length=10, choices=PROFILE_CHOICES, default='personal'
    )  # Tie to user profile type
    name = models.CharField(max_length=255)  # Subscription name
    amount = models.DecimalField(max_digits=10, decimal_places=2)  # Subscription cost
    start_date = models.DateField()  # Start date of the subscription
    expiry_date = models.DateField()  # End date of the subscription
    reminder_days = models.PositiveIntegerField(
        choices=[
            (3, '3 days before'),
            (7, '7 days before'),
            (14, '14 days before'),
            (30, '30 days before')
        ],
        default=7
    )  # Reminder period
    email = models.EmailField()  # Email to send reminders

    created_at = models.DateTimeField(auto_now_add=True)  # Automatically set at creation
    updated_at = models.DateTimeField(auto_now=True)  # Automatically set at update

    def __str__(self):
        return f"{self.name} - {self.profile_type}"
    
    def is_reminder_due(self):
        reminder_date = self.expiry_date - timedelta(days=self.reminder_days)
        is_due = reminder_date <= date.today() < self.expiry_date
        print(f"Reminder for {self.name}: Reminder date = {reminder_date}, Today = {date.today()}, Is due = {is_due}")
        return is_due