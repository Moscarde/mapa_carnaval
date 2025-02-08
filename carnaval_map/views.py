from datetime import datetime

from django.http import JsonResponse
from django.shortcuts import render
from django.views.generic import View

from .models import Bloco, City


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
            "neighborhood",
        )

        cities_coords = City.objects.values("name", "avg_latitude", "avg_longitude")

        cities_ids = set(bloco["city"] for bloco in blocos)
        cities = [(city, city.replace("-", " ").title()) for city in cities_ids]

        dates = set(bloco["event_date"] for bloco in blocos)  # preciso mudar isso
        dates = sorted(dates)
        dates = [
            (date.strftime("%Y-%m-%d"), date.strftime("%d/%m/%Y")) for date in dates
        ]

        context = {
            "blocos": list(blocos),
            "cities": cities,
            "dates": list(dates),
            "cities_coords": list(cities_coords),
        }
        return render(request, "carnaval_map/index.html", context)




class FilterBlocosView(View):
    def get(self, request):
        city = request.GET.get("city", "")
        date = request.GET.get("date", "")
        neighborhood = request.GET.get("neighborhood", "")

        blocos_query = Bloco.objects.all()

        if city:
            blocos_query = blocos_query.filter(city=city)
        if date:
            blocos_query = blocos_query.filter(event_date=date)
        if neighborhood:
            blocos_query = blocos_query.filter(neighborhood=neighborhood)

        blocos = list(
            blocos_query.values(
                "name",
                "city",
                "subtitle",
                "event_date",
                "event_day",
                "event_time",
                "description",
                "latitude",
                "longitude",
                "neighborhood",
                "ticket_url",
            )
        )

        # Pegando as datas disponíveis na cidade selecionada
        dates = sorted(blocos_query.values_list("event_date", flat=True).distinct())
        dates = [(date, date.strftime("%d/%m/%Y")) for date in dates]

        # Pegando os bairros disponíveis na cidade selecionada
        neighborhoods = sorted(blocos_query.values_list("neighborhood", flat=True).distinct())

        return JsonResponse({"blocos": blocos, "dates": dates, "neighborhoods": neighborhoods})