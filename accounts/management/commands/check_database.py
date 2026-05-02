from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import DEFAULT_DB_ALIAS, connections


class Command(BaseCommand):
    help = "Checks the configured database connection without exposing credentials."

    def handle(self, *args, **options):
        db_settings = settings.DATABASES[DEFAULT_DB_ALIAS]
        connection = connections[DEFAULT_DB_ALIAS]

        self.stdout.write(f"Engine: {db_settings.get('ENGINE')}")
        self.stdout.write(f"Name: {db_settings.get('NAME')}")
        self.stdout.write(f"Host: {db_settings.get('HOST') or 'local'}")
        self.stdout.write(f"Port: {db_settings.get('PORT') or 'default'}")
        self.stdout.write(f"SSL mode: {db_settings.get('OPTIONS', {}).get('sslmode', 'not set')}")

        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()

                if connection.vendor == "postgresql":
                    cursor.execute("SELECT current_database(), version()")
                    database_name, version = cursor.fetchone()
                    self.stdout.write(f"Postgres database: {database_name}")
                    self.stdout.write(f"Postgres version: {version.split(',')[0]}")
        except Exception as exc:
            raise CommandError(f"Database connection failed: {exc}") from exc

        self.stdout.write(self.style.SUCCESS("Database connection OK."))
