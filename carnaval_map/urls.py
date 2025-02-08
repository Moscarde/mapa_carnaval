from django.urls import path, include
from .views import CarnavalMapView, FilterBlocosView

urlpatterns = [
    path("", CarnavalMapView.as_view(), name="index"),
    path("filter-blocos/", FilterBlocosView.as_view(), name="filter_blocos"),

]
