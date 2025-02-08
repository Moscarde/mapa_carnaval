import requests
from bs4 import BeautifulSoup
import pandas as pd
import os
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor
from get_coords import process_addresses

BASE_URL = "https://www.blocosderua.com/"
DATA_DIR = "data"
EVENTS_CSV = os.path.join(DATA_DIR, "event_links.csv")
EVENTS_RAW_DIR = os.path.join(DATA_DIR, "events_data_raw")
EVENTS_PROCESSED_CSV = os.path.join(DATA_DIR, "event_data.csv")

def get_cities_urls():
    response = requests.get(BASE_URL)
    if response.status_code != 200:
        print(f"Error: {response.status_code}")
        return []
    
    soup = BeautifulSoup(response.text, "html.parser")
    options = soup.find("select", class_="dms-select").find_all("option")
    return [option["value"] for option in options if option["value"]] + [BASE_URL]


def get_city_full_page_url(city_url):
    response = requests.get(city_url)
    if response.status_code != 200:
        print("Erro Status:", response.status_code)
        return None
    
    soup = BeautifulSoup(response.text, "html.parser")
    btn_links = [link["href"] for link in soup.find_all("a", class_="btn") if city_url in link["href"]]
    return btn_links[0] if btn_links else None


def get_city_events_links(city_url):
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
        event_links = [l["href"] for l in soup.find_all("a", class_="card") if "programacao/" in l["href"]]
        
        if not event_links:
            break
        
        city_events_links.extend(event_links)
        i += 1
    
    return city_events_links


def update_event_links():
    print("Getting cities URLs...")
    cities_urls = get_cities_urls()
    all_events = []
    
    for url in tqdm(cities_urls, desc="Getting events links from cities"):
        city = url.split('/')[-2] if "www" not in url else "sao-paulo"
        event_links = get_city_events_links(url)
        all_events.extend([(city, link) for link in event_links])
    
    df_city = pd.DataFrame(all_events, columns=["city", "event_link"])
    
    print("Saving events links...")
    if os.path.exists(EVENTS_CSV):
        df_existing = pd.read_csv(EVENTS_CSV)
        df_city = pd.concat([df_existing, df_city]).drop_duplicates(subset="event_link")
    
    df_city.to_csv(EVENTS_CSV, mode="w", header=True, index=False)


def fetch_event_page(city, url):
    city_dir = os.path.join(EVENTS_RAW_DIR, city)
    os.makedirs(city_dir, exist_ok=True)
    
    filename = url.split("/")[-2] + ".html"
    file_path = os.path.join(city_dir, filename)
    
    if os.path.exists(file_path):
        return
    
    print("Fetching:", city, filename)
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(response.text)
    except requests.RequestException as e:
        print(f"Erro ao baixar {url}: {e}")


def fetch_and_save_event_pages(num_workers=3):
    if not os.path.exists(EVENTS_CSV):
        print(f"Arquivo {EVENTS_CSV} não encontrado.")
        return
    
    df = pd.read_csv(EVENTS_CSV)
    
    with ThreadPoolExecutor(max_workers=num_workers) as executor:
        executor.map(lambda row: fetch_event_page(row.city, row.event_link), df.itertuples())


def process_event_pages():
    print("Processing event pages...")
    processed_events = set()
    if os.path.exists(EVENTS_PROCESSED_CSV):
        df_existing = pd.read_csv(EVENTS_PROCESSED_CSV)
        processed_events = set(df_existing["event_page_link"].tolist())
    
    files_data = []
    for city_dir in os.listdir(EVENTS_RAW_DIR):
        city_path = os.path.join(EVENTS_RAW_DIR, city_dir)
        for filename in os.listdir(city_path):
            if filename.endswith(".html"):
                event_page_link = f"{BASE_URL}{city_dir}/programacao/{filename.replace('.html', '')}"
                if event_page_link in processed_events:
                    continue
                
                with open(os.path.join(city_path, filename), "r", encoding="utf-8") as f:
                    soup = BeautifulSoup(f, "html.parser")
                
                event_data = {
                    "city": city_dir,
                    "event_name": soup.find("h1", class_=["text-secondary", "h2", "text-center"]).text,
                    "event_subtitle": soup.find("h2", class_=["card-text", "text-white", "h6", "text-center", "text-default"]).text,
                    "event_text": soup.find("h2", class_=["card-text", "text-white", "h6", "text-center", "text-default"]).find_next("p").text,
                    "ticket": soup.find_all("h6")[0].text.strip(),
                    "ticket_link": soup.find_all("h6")[0].find("a")["href"] if soup.find_all("h6")[0].find("a") else "",
                    "address": soup.find_all("h6")[1].text.strip(),
                    "address_gmaps": soup.find_all("h6")[1].find("a")["href"],
                    "event_page_link": event_page_link
                }
                
                files_data.append(event_data)

    if not files_data:
        return
    
    df_new = pd.DataFrame(files_data)
    df_new[["date", "date_day", "time"]] = df_new["event_subtitle"].str.split(" - ", expand=True)
    df_new["time"] = df_new["time"].str.split(" ").str[0]
    
    if os.path.exists(EVENTS_PROCESSED_CSV):
        df_existing = pd.read_csv(EVENTS_PROCESSED_CSV)
        df_new = pd.concat([df_existing, df_new]).drop_duplicates(subset=["event_page_link"])
    
    df_new.to_csv(EVENTS_PROCESSED_CSV, index=False)

if __name__ == "__main__":
    update_event_links()
    fetch_and_save_event_pages()
    process_event_pages()
    process_addresses(EVENTS_PROCESSED_CSV)

    print("Done!")
