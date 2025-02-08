import googlemaps
import pandas as pd
import time
from decouple import config
from tqdm import tqdm
import os

# Carrega a chave da API do Google Maps do .env
API_KEY = config("API_KEY")
INPUT_FILE = "data/event_data.csv"
OUTPUT_FILE = "data/event_data_with_coords.csv"

# Inicializa o cliente Google Maps
gmaps = googlemaps.Client(key=API_KEY)

def get_coordinates(address):
    """
    Obtém latitude e longitude de um endereço usando a API do Google Maps.
    
    :param address: String com o endereço a ser buscado.
    :return: Tupla (latitude, longitude) ou None em caso de erro.
    """
    try:
        geocode_result = gmaps.geocode(address)
        if geocode_result:
            location = geocode_result[0]["geometry"]["location"]
            return location["lat"], location["lng"]
    except Exception as e:
        print(f"Erro ao buscar {address}: {e}")
    return None

def process_addresses(input_file=INPUT_FILE, output_file=OUTPUT_FILE, delay=1):
    """
    Lê um CSV de entrada, obtém coordenadas dos endereços e salva em um novo CSV.
    Apenas processa novos endereços ainda não cadastrados.

    :param input_file: Caminho do arquivo CSV com os endereços.
    :param output_file: Caminho do arquivo CSV onde os resultados serão salvos.
    :param delay: Tempo (segundos) entre requisições para evitar limites da API.
    """
    # Lê os dados de entrada
    df = pd.read_csv(input_file)

    # Se o arquivo de saída existir, carregar os dados processados
    if os.path.exists(output_file):
        df_processed = pd.read_csv(output_file)
        processed_addresses = set(df_processed["address"])
    else:
        df_processed = pd.DataFrame()
        processed_addresses = set()

    # Filtra apenas endereços novos
    df_new = df[~df["address"].isin(processed_addresses)]

    if df_new.empty:
        print("Nenhum novo endereço para processar.")
        return

    print(f"Processando {len(df_new)} novos endereços...")

    latitudes = []
    longitudes = []

    for _, row in tqdm(df_new.iterrows(), total=len(df_new), desc="Processando endereços"):
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

        time.sleep(delay)

    # Adiciona as novas coordenadas ao DataFrame
    df_new["latitude"] = latitudes
    df_new["longitude"] = longitudes

    # Concatena os dados processados com os novos e salva o arquivo atualizado
    df_final = pd.concat([df_processed, df_new])
    df_final.to_csv(output_file, index=False)

    print("Processamento concluído! Arquivo atualizado:", output_file)


if __name__ == "__main__":
    df = pd.read_csv("data/event_data.csv")
    process_addresses(df)