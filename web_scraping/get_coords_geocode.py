import pandas as pd
from geopy.exc import GeocoderTimedOut
from geopy.geocoders import Nominatim
from tqdm import tqdm

geolocator = Nominatim(user_agent="my_app")


def get_coordinates(address):
    try:
        location = geolocator.geocode(address, timeout=10)
        if location:
            return location.latitude, location.longitude
    except GeocoderTimedOut:
        return None
    return None


def process_df(df):
    latitudes = []
    longitudes = []

    for i, row in tqdm(df.iterrows(), total=len(df)):
        city = row["city"].replace("-", " ")
        address = f"Brasil, {city}, {row['address']}"

        coords = get_coordinates(address)

        if coords is None:
            print(f"Não foi possível obter coordenadas para: {address}")
            latitudes.append(None)
            longitudes.append(None)
        else:
            lat, lon = coords
            latitudes.append(lat)
            longitudes.append(lon)

    df["latitude"] = latitudes
    df["longitude"] = longitudes

    df.to_csv("data/event_data_with_coords.csv", index=False)


if __name__ == "__main__":

    df = pd.read_csv("data/event_data.csv")
    process_df(df)
