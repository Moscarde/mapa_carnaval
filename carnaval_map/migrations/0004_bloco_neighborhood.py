# Generated by Django 5.1.4 on 2025-02-08 00:50

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("carnaval_map", "0003_city"),
    ]

    operations = [
        migrations.AddField(
            model_name="bloco",
            name="neighborhood",
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
    ]
