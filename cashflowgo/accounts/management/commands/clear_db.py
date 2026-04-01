from django.core.management.base import BaseCommand
from django.apps import apps

class Command(BaseCommand):
    help = 'Clears all data from all models'

    def handle(self, *args, **kwargs):
        for model in apps.get_models():
            model.objects.all().delete()
        self.stdout.write(self.style.SUCCESS('Successfully cleared all data from the database.'))
