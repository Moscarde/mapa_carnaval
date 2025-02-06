from django.urls import path, include
from .views import CarnavalMapView

urlpatterns = [
    path("", CarnavalMapView.as_view(), name="index"),
]
