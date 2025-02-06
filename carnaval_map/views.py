from django.shortcuts import render
from django.views.generic import View

from .models import Bloco


# Create your views here.
class CarnavalMapView(View):
    def get(self, request):
        blocos = Bloco.objects.values(
            "name",
            "city",
            "subtitle",
            "description",
            "ticket_info",
            "ticket_url",
            "latitude",
            "longitude",
        )
        context = {"blocos": list(blocos)}
        return render(request, "carnaval_map/index.html", context)
