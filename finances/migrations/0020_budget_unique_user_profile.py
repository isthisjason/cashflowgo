from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("finances", "0019_alter_transaction_user"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="budget",
            constraint=models.UniqueConstraint(
                fields=("user", "profile_type"),
                name="unique_budget_per_user_profile",
            ),
        ),
    ]

