# Mapa de Blocos de Carnaval 2025

Este projeto é uma aplicação web desenvolvida em Django que permite explorar os blocos de carnaval de 2025 diretamente em um mapa interativo. A aplicação utiliza técnicas de web scraping para coletar dados de eventos, integração com a API do Google Geocoding para processamento de coordenadas e JavaScript para a renderização dinâmica do mapa e filtros.

## Funcionalidades

- **Mapa Interativo**: Visualização dos blocos de carnaval em um mapa utilizando a biblioteca Leaflet.
- **Filtros Dinâmicos**: Filtragem de blocos por cidade, bairro e data.
- **Web Scraping**: Coleta automática de dados de eventos de carnaval.
- **Geocoding**: Conversão de endereços em coordenadas geográficas utilizando a API do Google Geocoding.
- **Design Responsivo**: Layout adaptável para diferentes dispositivos.

## Tecnologias Utilizadas

- **Django**: Framework web para desenvolvimento rápido e seguro.
- **Leaflet**: Biblioteca JavaScript para mapas interativos.
- **Google Geocoding API**: API para conversão de endereços em coordenadas geográficas.
- **Web Scraping**: Técnica para coleta de dados de páginas web.
- **JavaScript**: Linguagem de programação para interatividade e dinamismo na página.
- **Bootstrap**: Framework CSS para design responsivo.

## Estrutura do Projeto

O projeto é composto por duas principais aplicações Django:

1. **core**: Contém as configurações principais do projeto.
2. **carnaval_map**: Aplicação responsável pela lógica de negócio, incluindo modelos, views, templates e comandos personalizados.

### Modelos Principais

- **City**: Armazena as cidades e suas coordenadas médias.
- **RawBloco**: Modelo temporário para armazenar dados brutos coletados via web scraping.
- **Bloco**: Modelo final com dados processados dos blocos de carnaval.

### Views Principais

- **CarnavalMapView**: View principal que renderiza o mapa e os filtros.
- **FilterBlocosView**: View para filtragem dinâmica dos blocos.

### Templates

- **base.html**: Template base que define a estrutura comum das páginas.
- **index.html**: Template principal que renderiza o mapa e os filtros.

## Como Executar o Projeto

### Pré-requisitos

- Python 3.x
- Django
- Google Geocoding API Key

### Instalação

1. Clone o repositório:
```bash
   git clone https://github.com/moscarde/mapa_carnaval.git
   cd mapa_carnaval
```

2. Crie um ambiente virtual e instale as dependências:
```bash
    python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
```

3. Configure a chave da API do Google Geocoding no arquivo .env:
```bash
    API_KEY=*
```

4. Execute as migrações:
```bash
    python manage.py migrate
```

5. Inicie o servidor local:
```bash
    python manage.py runserver
```

6. Acesse o projeto em:
```bash
    http://localhost:8000
```

7. (Opcional) Execute os comandos de web scraping:
```bash
    python manage.py web_scraping
```

## Disclaimer

Este projeto foi desenvolvido **exclusivamente para fins educacionais** e não possui qualquer objetivo comercial. Os dados originais sobre os blocos de carnaval foram obtidos do site [Blocos de Rua](https://www.blocosderua.com/), que é constantemente referenciado na interface do projeto como fonte primária das informações. O uso desses dados é feito com o intuito de estudo e aprendizado, sem qualquer intenção de infringir direitos autorais ou de propriedade intelectual.