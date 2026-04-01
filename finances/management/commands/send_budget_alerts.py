from django.core.management.base import BaseCommand
from finances.models import Budget
from finances.utils import send_notification_email

class Command(BaseCommand):
    help = 'Send over-budget alerts'

    def handle(self, *args, **kwargs):
        budgets = Budget.objects.all()
        for budget in budgets:
            if budget.is_over_budget():
                subject = f"Budget Alert: {budget.profile_type} Budget Exceeded"
                message = (
                    f"Hi {budget.user.email},\n\n"
                    f"You have exceeded your monthly budget for {budget.profile_type}.\n"
                    f"Current spending: ${budget.calculate_current_spending()}\n"
                    f"Monthly limit: ${budget.monthly_limit}\n\n"
                    f"Best regards,\nCashFlowGo Team"
                )
                send_notification_email(subject, message, [budget.user.email])