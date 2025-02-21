# Generated by Django 5.1.4 on 2025-02-07 01:12

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("carnaval_map", "0002_alter_bloco_event_time_alter_rawbloco_event_time"),
    ]

    operations = [
        migrations.CreateModel(
            name="City",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=100, unique=True)),
                ("avg_latitude", models.FloatField(blank=True, null=True)),
                ("avg_longitude", models.FloatField(blank=True, null=True)),
            ],
        ),
    ]
