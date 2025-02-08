console.log("Olá mundo!");

document.addEventListener("DOMContentLoaded", () => {
	function createMap(center, zoom) {
		const map = L.map("map").setView(center, zoom);
		L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
			maxZoom: 19,
			attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
		}).addTo(map);
		return map;
	}

	const map = createMap([-22.85, -43.28], 12);
	const cities_coords = JSON.parse(document.getElementById("cities_coords").textContent);

	let markers = [];

	function clearMarkers() {
		markers.forEach(marker => map.removeLayer(marker));
		markers = [];
	}

	function loadBlocos(blocos) {
		clearMarkers();
		blocos.forEach((bloco) => {
			const marker = L.marker([bloco.latitude, bloco.longitude]).addTo(map);
			marker.bindPopup(`
				<h3>${bloco.name}</h3>
				<p>${bloco.description}</p>
			`);
			markers.push(marker);
		});
	}

	// Carregar todos os blocos ao iniciar
	const blocos = JSON.parse(document.getElementById("blocos").textContent);
	loadBlocos(blocos);

	// Atualiza os valores do select de datas
	function updateDateFilter(dates) {
		const dateSelect = document.getElementById("date");
		dateSelect.innerHTML = '<option value="">Todas as datas</option>';

		dates.forEach(([value, label]) => {
			const option = document.createElement("option");
			option.value = value;
			option.textContent = label;
			dateSelect.appendChild(option);
		});
	}

	// Listener para filtro de cidade
	const citySelect = document.getElementById("city");
	citySelect.addEventListener("change", (event) => {
		const selectedCity = event.target.value;
		const cityData = cities_coords.find((city) => city.name === selectedCity);

		if (cityData) {
			map.setView([cityData.avg_latitude, cityData.avg_longitude], 9);
		} else {
			map.setView([-22.85, -43.28], 10);
		}

		// Fazer requisição AJAX para buscar blocos e datas filtradas
		fetch(`/filter-blocos/?city=${selectedCity}`)
			.then(response => response.json())
			.then(data => {
				if (data.blocos) {
					loadBlocos(data.blocos);
				}
				if (data.dates) {
					updateDateFilter(data.dates);
				}
			})
			.catch(error => console.error("Erro na requisição:", error));
	});

	// Listener para filtro de data
	const dateSelect = document.getElementById("date");
	dateSelect.addEventListener("change", (event) => {
		const selectedDate = event.target.value;
		const selectedCity = citySelect.value;

		if (!selectedDate) {
			fetch(`/filter-blocos/?city=${selectedCity}`)
				.then(response => response.json())
				.then(data => {
					if (data.blocos) {
						loadBlocos(data.blocos);
					}
				})
				.catch(error => console.error("Erro na requisição:", error));
			return;
		}

		fetch(`/filter-blocos/?city=${selectedCity}&date=${selectedDate}`)
			.then(response => response.json())
			.then(data => {
				if (data.blocos) {
					loadBlocos(data.blocos);
				}
			})
			.catch(error => console.error("Erro na requisição:", error));
	});
});
