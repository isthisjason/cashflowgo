from django.core.management.base import BaseCommand
from finances.utils import process_subscription_reminders

class Command(BaseCommand):
    help = 'Send subscription reminders'

    def handle(self, *args, **kwargs):
        process_subscription_reminders()