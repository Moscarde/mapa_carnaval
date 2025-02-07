from django.db import models


class RawBloco(models.Model):
    """Armazena os dados brutos coletados via web scraping."""

    city = models.CharField(max_length=100)
    name = models.CharField(max_length=200)  # Nome do evento
    subtitle = models.CharField(max_length=200, blank=True, null=True)
    description = models.TextField()  # Texto descritivo do evento
    ticket_info = models.CharField(max_length=50, blank=True, null=True)
    ticket_url = models.URLField(blank=True, null=True)
    address = models.CharField(max_length=255)  # Endereço textual
    address_gmaps_url = models.URLField(blank=True, null=True)
    event_page_url = models.URLField(blank=True, null=True)
    event_date = models.DateField(blank=True, null=True)
    event_day = models.CharField(max_length=20, blank=True, null=True)
    event_time = models.CharField(max_length=20, blank=True, null=True)

    # Data e horário (serão preenchidos depois)
    scraped_at = models.DateTimeField(auto_now_add=True)  # Momento da coleta
    processed = models.BooleanField(default=False)  # Indica se já foi processado

    def __str__(self):
        return f"[RAW] {self.name} - {self.city}"


class Bloco(models.Model):
    """Armazena os dados limpos e transformados dos blocos de carnaval."""

    raw_data = models.OneToOneField(
        RawBloco, on_delete=models.CASCADE, related_name="cleaned_data"
    )

    city = models.CharField(max_length=100)
    name = models.CharField(max_length=200)
    subtitle = models.CharField(max_length=200, blank=True, null=True)
    description = models.TextField()
    ticket_info = models.CharField(max_length=50, blank=True, null=True)
    ticket_url = models.URLField(blank=True, null=True)
    address = models.CharField(max_length=255)
    address_gmaps_url = models.URLField(blank=True, null=True)
    event_page_url = models.URLField(blank=True, null=True)

    # Data e horário (preenchidos após a transformação)
    event_date = models.DateField(blank=True, null=True)
    event_day = models.CharField(max_length=20, blank=True, null=True)
    event_time = models.CharField(max_length=20, blank=True, null=True)

    # Coordenadas (serão preenchidas posteriormente)
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)

    processed_at = models.DateTimeField(auto_now=True)  # Momento da última atualização

    def __str__(self):
        return f"{self.name} - {self.city}"


class City(models.Model):
    """Armazena informações sobre a cidade e suas coordenadas médias."""
    
    name = models.CharField(max_length=100, unique=True)
    avg_latitude = models.FloatField(blank=True, null=True)
    avg_longitude = models.FloatField(blank=True, null=True)

    def __str__(self):
        return f"{self.name} ({self.avg_latitude}, {self.avg_longitude})"