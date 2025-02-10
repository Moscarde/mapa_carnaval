# %%
import time
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

import googlemaps
import pandas as pd
import requests
from bs4 import BeautifulSoup
from decouple import config
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Max, Min

from carnaval_map.models import Bloco, City, RawBloco


BASE_URL = "https://www.blocosderua.com/"

API_KEY = config("API_KEY")
gmaps = googlemaps.Client(key=API_KEY)

# %%


def get_cities_urls():
    """
    Fetches the URLs of cities from the base website.

    Returns:
        list: A list of city URLs or an empty list if an error occurs.
    """
    try:
        response = requests.get(BASE_URL)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        options = soup.find("select", class_="dms-select").find_all("option")
        return [option["value"] for option in options if option["value"]] + [BASE_URL]
    except requests.RequestException as e:
        print(f"Requests Error: {e}")
        return []

    except Exception as e:
        print(f"Error: {e}")
        return []


def get_city_full_page_url(city_url):
    """
    Retrieves the full page URL for a given city URL.

    Args:
        city_url (str): The URL of the city.

    Returns:
        str: The full page URL or None if an error occurs.
    """
    try:
        response = requests.get(city_url)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        btn_links = [
            link["href"]
            for link in soup.find_all("a", class_="btn")
            if city_url in link["href"]
        ]
        return btn_links[0] if btn_links else None

    except requests.RequestException as e:
        print(f"Requests Error: {e}")
        return None


def get_city_events_links(city_url):
    """
    Fetches all event links for a given city URL.

    Args:
        city_url (str): The URL of the city.

    Returns:
        list: A list of event links or an empty list if no links are found.
    """
    full_page_url = get_city_full_page_url(city_url)
    if not full_page_url:
        return []

    city_events_links = []
    i = 1
    print(f"Getting events links from {city_url}")
    while True:
        print("Page:", i)
        target_page = f"{full_page_url}?paged={i}&data=&bairro="

        response = requests.get(target_page)
        if response.status_code != 200:
            break

        soup = BeautifulSoup(response.text, "html.parser")
        event_links = [
            l["href"]
            for l in soup.find_all("a", class_="card")
            if "programacao/" in l["href"]
        ]

        if not event_links:
            break

        city_events_links.extend(event_links)
        i += 1

    return city_events_links


def get_events_links():
    """
    Fetches event links for all cities.

    Returns:
        pd.DataFrame: A DataFrame containing city and event URLs, or None if no new events are found.
    """
    print("Getting events from cities urls...")

    cities_urls = get_cities_urls()

    existing_urls = set(RawBloco.objects.values_list("event_page_url", flat=True))
    all_events = []

    for url in cities_urls:
        city_tag = url.split("/")[-2]
        city = city_tag if "www" not in city_tag else "sao-paulo"

        event_links = get_city_events_links(url)

        new_links = [link for link in event_links if link not in existing_urls]

        all_events.extend([(city, link) for link in new_links])

    print(len(all_events), "new events found")

    if len(all_events) > 0:
        df_events = pd.DataFrame(all_events, columns=["city", "event_url"])
        return df_events

    return None

def fetch_event_page(city, url):
    """
    Fetches and parses event data from a given URL.

    Args:
        city (str): The city associated with the event.
        url (str): The URL of the event page.

    Returns:
        dict: A dictionary containing event data or None if an error occurs.
    """
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")
        data = {
            "city": city,
            "name": soup.find(
                "h1", class_=["text-secondary", "h2", "text-center"]
            ).text,
            "subtitle": soup.find(
                "h2",
                class_=[
                    "card-text",
                    "text-white",
                    "h6",
                    "text-center",
                    "text-default",
                ],
            ).text,
            "description": soup.find(
                "h2",
                class_=[
                    "card-text",
                    "text-white",
                    "h6",
                    "text-center",
                    "text-default",
                ],
            )
            .find_next("p")
            .text,
            "ticket_info": soup.find_all("h6")[0].text.strip(),
            "ticket_url": (
                soup.find_all("h6")[0].find("a")["href"]
                if soup.find_all("h6")[0].find("a")
                else ""
            ),
            "address": soup.find_all("h6")[1].text.strip(),
            "address_gmaps_url": soup.find_all("h6")[1].find("a")["href"],
            "event_page_url": url,
        }
        data["event_date"], data["event_day"], data["event_time"] = data[
            "subtitle"
        ].split(" - ")

        data["event_date"] = datetime.strptime(data["event_date"], "%d/%m/%Y").strftime(
            "%Y-%m-%d"
        )
        data["event_time"] = data["event_time"].split(" ")[0]

        match = re.search(r"\d{2}/\d{2}/\d{4} - .*? - \d{2}:\d{2}\s*(.*)", data["subtitle"])
        
        if match:
            data["neighborhood"] = match.group(1).strip()
        else:
            data["neighborhood"] = None

        return data

    except Exception as e:
        print(f"Erro ao baixar {url}: {e}")
        return None


def process_links(df, max_workers=3):
    """
    Processes event links in parallel using ThreadPoolExecutor.

    Args:
        df (pd.DataFrame): A DataFrame containing city and event URLs.
        max_workers (int): The maximum number of worker threads.
    """
    print("Processing links... (Parallel)")
    with ThreadPoolExecutor(max_workers) as executor:
        futures = {
            executor.submit(fetch_event_page, row["city"], row["event_url"]): row
            for _, row in df.iterrows()
        }

    for future in as_completed(futures):
        row = futures[future]
        try:
            data = future.result()
            if data:
                bloco = RawBloco(**data)
                bloco.save()
                print(
                    f"{row['city']} - {row['event_url'].split('/')[-2]} salvo no banco."
                )
            else:
                print(f"{row['city']} - {row['event_url'].split('/')[-2]} falhou.")
        except Exception as e:
            print(
                f"Erro ao salvar {row['city']} - {row['event_url'].split('/')[-2]}: {e}"
            )

    return


def get_coordinates(address):
    """
    Retrieves latitude and longitude for a given address using the Google Maps API.

    Args:
        address (str): The address to geocode.

    Returns:
        tuple: A tuple containing (latitude, longitude) or None if an error occurs.
    """
    try:
        geocode_result = gmaps.geocode(address)
        if geocode_result:
            location = geocode_result[0]["geometry"]["location"]
            return location["lat"], location["lng"]
    except Exception as e:
        print(f"Erro ao buscar {address}: {e}")
    return None


def process_addresses(delay=1):
    """
    Processes raw blocos to extract coordinates and save them to the Bloco model.

    Args:
        delay (int): Delay between requests to avoid rate limiting.
    """
    print("Processing addresses")
    raw_blocos = RawBloco.objects.filter(processed=False)

    if not raw_blocos.exists():
        print("Nenhum novo bloco para processar.")
        return

    print(f"Processando {raw_blocos.count()} blocos...")

    with transaction.atomic():  # Garante consistência no banco de dados
        for i, raw_bloco in enumerate(raw_blocos):
            print(
                "Processando bloco",
                i + 1,
                "de",
                raw_blocos.count(),
                "-",
                raw_bloco.name,
            )
            # Obtém as coordenadas a partir do endereço
            city = raw_bloco.city.replace("-", " ")
            address = f"Brasil, {city}, {raw_bloco.address}"
            coords = get_coordinates(address)

            if coords is None:
                print(f"❌ Não foi possível obter coordenadas para: {address}")
                latitude, longitude = None, None
            else:
                latitude, longitude = coords

            # Criando o registro na tabela Bloco
            Bloco.objects.create(
                raw_data=raw_bloco,
                city=raw_bloco.city,
                name=raw_bloco.name,
                subtitle=raw_bloco.subtitle,
                description=raw_bloco.description,
                ticket_info=raw_bloco.ticket_info,
                ticket_url=raw_bloco.ticket_url,
                address=raw_bloco.address,
                neighborhood=raw_bloco.neighborhood,
                address_gmaps_url=raw_bloco.address_gmaps_url,
                event_page_url=raw_bloco.event_page_url,
                event_date=raw_bloco.event_date,
                event_day=raw_bloco.event_day,
                event_time=raw_bloco.event_time,
                latitude=latitude,
                longitude=longitude,
            )

            # Marca o registro como processado
            raw_bloco.processed = True
            raw_bloco.save()

            time.sleep(delay)  # Delay entre requisições para evitar bloqueios

    print("✅ Processamento concluído!")


def update_city_coordinates():
    """
    Updates the average coordinates for each city based on the Bloco model.
    """

    cities = Bloco.objects.values_list("city", flat=True).distinct()

    for city in cities:
        print(f"Processando cidade: {city}")

        min_lat = Bloco.objects.filter(city=city).aggregate(Min("latitude"))[
            "latitude__min"
        ]
        max_lat = Bloco.objects.filter(city=city).aggregate(Max("latitude"))[
            "latitude__max"
        ]
        min_lon = Bloco.objects.filter(city=city).aggregate(Min("longitude"))[
            "longitude__min"
        ]
        max_lon = Bloco.objects.filter(city=city).aggregate(Max("longitude"))[
            "longitude__max"
        ]

        if None in (min_lat, max_lat, min_lon, max_lon):
            print(f"Pulando {city}, pois não há coordenadas suficientes.")
            continue

        avg_lat = (min_lat + max_lat) / 2
        avg_lon = (min_lon + max_lon) / 2

        city_obj, created = City.objects.update_or_create(
            name=city,
            defaults={"avg_latitude": avg_lat, "avg_longitude": avg_lon},
        )

        if created:
            print(f"📍 Cidade adicionada: {city} ({avg_lat}, {avg_lon})")
        else:
            print(f"🔄 Cidade atualizada: {city} ({avg_lat}, {avg_lon})")


class Command(BaseCommand):
    """
    Django management command to fetch and process event data.
    """

    help = "Creates objects in the Locations model from a CSV file"

    def handle(self, *args, **options):
        df = get_events_links()
        if df is not None:
            process_links(df)

        process_addresses()
        update_city_coordinates()
        print("Done")
