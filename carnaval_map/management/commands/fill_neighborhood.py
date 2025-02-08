import re
from django.core.management.base import BaseCommand
from carnaval_map.models import Bloco  

class Command(BaseCommand):
    help = "Corrige o campo 'neighborhood' extraindo corretamente do 'subtitle'."

    def handle(self, *args, **kwargs):
        blocos = Bloco.objects.exclude(subtitle__isnull=True).exclude(subtitle="")

        updated_count = 0

        for bloco in blocos:
            # Expressão regular para capturar o texto após o último "-"
            match = re.search(r" - ([^-\n]+)$", bloco.subtitle)
            if match:
                neighborhood = match.group(1).strip()
                
                # Atualiza apenas se o bairro estiver incorreto ou ausente
                if bloco.neighborhood != neighborhood:
                    bloco.neighborhood = neighborhood
                    bloco.save()
                    updated_count += 1

        self.stdout.write(self.style.SUCCESS(f"{updated_count} registros corrigidos."))
