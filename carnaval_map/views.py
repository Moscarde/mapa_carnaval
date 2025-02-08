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
            "event_date",
            "event_day",
            "event_time",
            "description",
            "ticket_info",
            "ticket_url",
            "latitude",
            "longitude",
        )
        cities = set(bloco["city"].replace("-", " ").title() for bloco in blocos)

        dates = set(bloco["event_date"] for bloco in blocos)

        context = {"blocos": list(blocos), "cities": list(cities), "dates": list(dates)}
        return render(request, "carnaval_map/index.html", context)
