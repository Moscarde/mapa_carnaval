import re
from django.core.management.base import BaseCommand
from carnaval_map.models import Bloco

class Command(BaseCommand):
    help = "Corrige o campo 'neighborhood' extraindo corretamente do 'subtitle'."

    def handle(self, *args, **kwargs):
        blocos = Bloco.objects.exclude(subtitle__isnull=True).exclude(subtitle="")

        updated_count = 0

        for bloco in blocos:
            # Expressão regular para remover a parte de data e horário e capturar o bairro
            match = re.search(r"\d{2}/\d{2}/\d{4} - .*? - \d{2}:\d{2}\s*(.*)", bloco.subtitle)
            if match:
                neighborhood = match.group(1).strip()  # Captura apenas o bairro
                
                # Atualiza apenas se o bairro estiver incorreto ou ausente
                if bloco.neighborhood != neighborhood:
                    bloco.neighborhood = neighborhood
                    bloco.save()
                    updated_count += 1

        self.stdout.write(self.style.SUCCESS(f"{updated_count} registros corrigidos."))
