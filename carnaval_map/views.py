from datetime import datetime

from django.http import JsonResponse
from django.shortcuts import render
from django.views.generic import View

from .models import Bloco, City

class CarnavalMapView(View):
    def get(self, request):
        blocos = self.get_blocos()
        cities_coords = self.get_cities_coords()
        cities = self.format_cities(blocos)
        dates = self.format_dates(blocos)

        context = {
            "blocos": blocos,
            "cities": cities,
            "dates": dates,
            "cities_coords": cities_coords,
        }
        return render(request, "carnaval_map/index.html", context)

    def get_blocos(self):
        return list(
            Bloco.objects.values(
                "name", "city", "subtitle", "event_date", "event_day", "event_time",
                "description", "ticket_info", "ticket_url", "latitude", "longitude",
                "neighborhood", "event_page_url", "address_gmaps_url", "address"
            ).order_by("event_date")
        )

    def get_cities_coords(self):
        return list(City.objects.values("name", "avg_latitude", "avg_longitude"))

    def format_cities(self, blocos):
        cities_ids = {bloco["city"] for bloco in blocos}
        return [(city, city.replace("-", " ").title()) for city in cities_ids]

    def format_dates(self, blocos):
        dates = sorted({bloco["event_date"] for bloco in blocos})
        return [(date.strftime("%Y-%m-%d"), date.strftime("%d/%m/%Y")) for date in dates]


class FilterBlocosView(View):
    def get(self, request):
        city = request.GET.get("city", "")
        date = request.GET.get("date", "")
        neighborhood = request.GET.get("neighborhood", "")

        blocos_query = self.filter_blocos(city, date, neighborhood)
        blocos = self.get_blocos_list(blocos_query)
        dates = self.get_dates(blocos_query)
        neighborhoods = self.get_neighborhoods(blocos_query)

        return JsonResponse({"blocos": blocos, "dates": dates, "neighborhoods": neighborhoods})

    def filter_blocos(self, city, date, neighborhood):
        query = Bloco.objects.all().order_by("event_date")
        if city:
            query = query.filter(city=city)
        if date:
            query = query.filter(event_date=date)
        if neighborhood:
            query = query.filter(neighborhood=neighborhood)
        return query

    def get_blocos_list(self, blocos_query):
        return list(
            blocos_query.values(
                "name", "city", "subtitle", "event_date", "event_day", "event_time",
                "description", "latitude", "longitude", "neighborhood", "ticket_url",
                "ticket_info", "event_page_url", "address_gmaps_url", "address"
            )
        )

    def get_dates(self, blocos_query):
        dates = sorted(blocos_query.values_list("event_date", flat=True).distinct())
        return [(date, date.strftime("%d/%m/%Y")) for date in dates]

    def get_neighborhoods(self, blocos_query):
        return sorted(blocos_query.values_list("neighborhood", flat=True).distinct())
