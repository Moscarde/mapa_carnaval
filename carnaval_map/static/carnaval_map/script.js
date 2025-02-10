document.addEventListener("DOMContentLoaded", () => {
	const MAP_CENTER = [-22.85, -43.28];
	const MAP_ZOOM = 12;
	const TILE_LAYER_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
	const TILE_LAYER_ATTRIBUTION = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>';
	const DISPLAYED_BLOCOS_COUNT = 5;

	const ICON_CONFIG = {
		freeUpcoming: { markerColor: "green", icon: "star" },
		freePast: { markerColor: "green", icon: "history" },
		paidUpcoming: { markerColor: "orange", icon: "star" },
		paidPast: { markerColor: "orange", icon: "history" }
	};

	const LEGEND_CATEGORIES = [
		{ color: "#71AE26", icon: "fa-star", label: "Gratuito - Futuro" },
		{ color: "#71AE26", icon: "fa-history", label: "Gratuito - Passado" },
		{ color: "orange", icon: "fa-star", label: "Pago - Futuro" },
		{ color: "orange", icon: "fa-history", label: "Pago - Passado" }
	];

	let map;
	let markers = [];
	let allBlocos = [];
	let displayedCount = DISPLAYED_BLOCOS_COUNT;

	function initializeMap(center, zoom) {
		map = L.map("map").setView(center, zoom);
		L.tileLayer(TILE_LAYER_URL, {
			maxZoom: 19,
			attribution: TILE_LAYER_ATTRIBUTION
		}).addTo(map);

		addLegend();
	}

	function addLegend() {
		const legend = L.control({ position: "bottomright" });

		legend.onAdd = function () {
			const div = L.DomUtil.create("div", "info legend");
			Object.assign(div.style, {
				backgroundColor: "white",
				padding: "10px",
				borderRadius: "5px",
				boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
				fontSize: "14px",
				color: "black"
			});

			LEGEND_CATEGORIES.forEach((category) => {
				div.innerHTML += `
                    <div style="display: flex; align-items: center; margin-bottom: 8px;">
                        <i class="fa ${category.icon}" style="color: white; background-color: ${category.color}; border-radius: 50%; padding: 5px;"></i>
                        <span style="margin-left: 8px;">${category.label}</span>
                    </div>
                `;
			});

			return div;
		};

		legend.addTo(map);
	}

	function createMarkerIcon(config) {
		return L.AwesomeMarkers.icon({
			markerColor: config.markerColor,
			iconColor: "white",
			icon: config.icon,
			prefix: "fa",
			extraClasses: "fa-rotate-0"
		});
	}

	function clearMarkers() {
		markers.forEach((marker) => map.removeLayer(marker));
		markers = [];
	}

	function filterBlocos() {
		const showPastEvents = document.getElementById("past-events").checked;
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		return allBlocos.filter((bloco) => {
			const blocoDate = new Date(bloco.event_date);
			blocoDate.setHours(0, 0, 0, 0);
			return showPastEvents || blocoDate >= today;
		});
	}

	function updateMarkers() {
		clearMarkers();
		const filteredBlocos = filterBlocos();

		filteredBlocos.forEach((bloco) => {
			const isFree = bloco.ticket_info === "Grátis";
			const today = new Date();
			const blocoDate = new Date(bloco.event_date);
			const isFuture = blocoDate >= today;

			let markerIcon;
			if (isFree) {
				markerIcon = isFuture ? createMarkerIcon(ICON_CONFIG.freeUpcoming) : createMarkerIcon(ICON_CONFIG.freePast);
			} else {
				markerIcon = isFuture ? createMarkerIcon(ICON_CONFIG.paidUpcoming) : createMarkerIcon(ICON_CONFIG.paidPast);
			}

			const marker = L.marker([bloco.latitude, bloco.longitude], { icon: markerIcon }).addTo(map);
			bindPopupToMarker(marker, bloco);
			markers.push(marker);
		});
	}

	function bindPopupToMarker(marker, bloco) {
		const eventDate = new Date(bloco.event_date);
		const formattedDate = eventDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

		const ticketContent = bloco.ticket_url ? `💲 <a href="${bloco.ticket_url}" target="_blank">${bloco.ticket_info}</a>` : `<strong>💲 ${bloco.ticket_info}</strong>`;
		const seeMoreContent = `🔍 <a href="${bloco.event_page_url || "#"}" target="_blank">Ver mais...</a>`;
		const mapLinkContent = `🗺️ <a href="${bloco.address_gmaps_url || "#"}" target="_blank">Veja como chegar</a>`;
		const whatsappText = `${formattedDate} - ${bloco.event_time} Vai acontecer o bloco ${bloco.name} em ${bloco.neighborhood || bloco.city}. ${bloco.event_page_url}`;
		const shareWhatsappContent = `📱 <a href="https://wa.me/?text=${whatsappText}" target="_blank">Compartilhar no WhatsApp</a>`;

		marker.bindPopup(`
            <div class="marker-popup">
                <h3>${bloco.name}</h3>
                <p>${ticketContent}</p>
                <p>📅 ${formattedDate} ${bloco.event_time}</p>
                <p>📍 ${bloco.neighborhood || bloco.city} - ${bloco.address || ""}</p>
                <p class="mt-2">${bloco.description.slice(0, 300) + (bloco.description.length > 300 ? "..." : "")}</p>
                <p class="mt-2">${seeMoreContent} ${mapLinkContent} ${shareWhatsappContent}</p>
            </div>
        `);
	}

	function renderBlocos() {
		const blocosContainer = document.getElementById("blocos");
		blocosContainer.innerHTML = "";

		const filteredBlocos = filterBlocos();
		const blocosByDate = groupBlocosByDate(filteredBlocos);

		let blocoCount = 0;

		Object.entries(blocosByDate).forEach(([dateKey, blocos]) => {
			if (blocoCount >= displayedCount) return;

			const dayContainer = document.createElement("div");
			dayContainer.classList.add("day-container");

			const dayHeader = document.createElement("h2");
			dayHeader.textContent = dateKey;
			dayContainer.appendChild(dayHeader);

			blocos.forEach((bloco) => {
				if (blocoCount >= displayedCount) return;

				const blocoCard = createBlocoCard(bloco, dateKey);
				dayContainer.appendChild(blocoCard);
				blocoCount++;
			});

			blocosContainer.appendChild(dayContainer);
		});

		addLoadMoreButton(blocosContainer, filteredBlocos.length, blocoCount);
		updateMarkers();
	}

	function groupBlocosByDate(blocos) {
		const blocosByDate = {};

		blocos.forEach((bloco) => {
			const eventDate = new Date(bloco.event_date);
			const formattedDate = eventDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
			const weekDay = eventDate.toLocaleDateString("pt-BR", { weekday: "long" });

			const dateKey = `${formattedDate} (${weekDay})`;

			if (!blocosByDate[dateKey]) {
				blocosByDate[dateKey] = [];
			}
			blocosByDate[dateKey].push(bloco);
		});

		return blocosByDate;
	}

	function createBlocoCard(bloco, dateKey) {
		const blocoCard = document.createElement("div");
		blocoCard.classList.add("bloco-card");

		const ticketContent = bloco.ticket_url ? `💲 <a href="${bloco.ticket_url}" target="_blank">${bloco.ticket_info}</a>` : `<strong>💲 ${bloco.ticket_info}</strong>`;
		const seeMoreContent = `🔍 <a href="${bloco.event_page_url || "#"}" target="_blank">Ver mais...</a>`;
		const mapLinkContent = `🗺️ <a href="${bloco.address_gmaps_url || "#"}" target="_blank">Veja como chegar</a>`;
		const whatsappText = `${dateKey} - ${bloco.event_time} Vai acontecer o bloco ${bloco.name} em ${bloco.neighborhood || bloco.city}. ${bloco.event_page_url}`;
		const shareWhatsappContent = `📱 <a href="https://wa.me/?text=${whatsappText}" target="_blank">Compartilhar no WhatsApp</a>`;

		blocoCard.innerHTML = `
            <div class="bloco-card-container">
                <div class="bloco-card-time">
                    <span>${bloco.event_time || "Horário não informado"}</span>
                </div>
                <div class="bloco-card-details">
                    <h3>${bloco.name}</h3>
                    <p><strong>📍 ${bloco.neighborhood || bloco.city} - ${bloco.address || ""}</strong></p>
                    <p>${ticketContent}</p>
                    ${seeMoreContent} ${mapLinkContent} ${shareWhatsappContent}
                </div>
            </div>
        `;

		return blocoCard;
	}

	function addLoadMoreButton(container, totalBlocos, displayedBlocos) {
		if (displayedBlocos < totalBlocos) {
			const loadMoreButton = document.createElement("button");
			loadMoreButton.textContent = "Carregar Mais";
			loadMoreButton.classList.add("load-more");
			loadMoreButton.addEventListener("click", () => {
				displayedCount += DISPLAYED_BLOCOS_COUNT;
				renderBlocos();
			});
			container.appendChild(loadMoreButton);
		}
	}

	function updateFilters(data) {
		if (data.dates) {
			updateDateFilter(data.dates);
		}
		if (data.neighborhoods) {
			updateNeighborhoodFilter(data.neighborhoods);
		}
	}

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

	function updateNeighborhoodFilter(neighborhoods) {
		const neighborhoodSelect = document.getElementById("neighborhood");
		neighborhoodSelect.innerHTML = '<option value="">Todos os bairros</option>';
		neighborhoods.forEach((neighborhood) => {
			const option = document.createElement("option");
			option.value = neighborhood;
			option.textContent = neighborhood;
			neighborhoodSelect.appendChild(option);
		});
	}

	function handleCityChange(event) {
		const selectedCity = event.target.value;

		const cities_coords = JSON.parse(document.getElementById("cities_coords").textContent);

		const cityData = cities_coords.find((city) => city.name === selectedCity);

		if (cityData) {
			map.setView([cityData.avg_latitude, cityData.avg_longitude], 9);
		} else {
			map.setView(MAP_CENTER, 10);
		}

		fetch(`/filter-blocos/?city=${selectedCity}`)
			.then((response) => response.json())
			.then((data) => {
				if (data.blocos) {
					loadBlocos(data.blocos);
				}
				updateFilters(data);
			})
			.catch((error) => console.error("Erro na requisição:", error));
	}

	function handleNeighborhoodChange(event) {
		const selectedNeighborhood = event.target.value;
		const selectedCity = citySelect.value;

		fetch(`/filter-blocos/?city=${selectedCity}&neighborhood=${selectedNeighborhood}`)
			.then((response) => response.json())
			.then((data) => {
				if (data.blocos) {
					loadBlocos(data.blocos);
				}
			})
			.catch((error) => console.error("Erro na requisição:", error));
	}

	function handleDateChange(event) {
		const selectedDate = event.target.value;
		const selectedCity = citySelect.value;
		const selectedNeighborhood = neighborhoodSelect.value;

		let url = `/filter-blocos/?city=${selectedCity}`;
		if (selectedNeighborhood) url += `&neighborhood=${selectedNeighborhood}`;
		if (selectedDate) url += `&date=${selectedDate}`;

		fetch(url)
			.then((response) => response.json())
			.then((data) => {
				if (data.blocos) {
					loadBlocos(data.blocos);
				}
			})
			.catch((error) => console.error("Erro na requisição:", error));
	}

	function loadBlocos(blocos) {
		allBlocos = blocos;
		renderBlocos();
	}

	initializeMap(MAP_CENTER, MAP_ZOOM);

	document.getElementById("past-events").addEventListener("change", renderBlocos);

	const blocos = JSON.parse(document.getElementById("blocos-json").textContent);
	loadBlocos(blocos);

	const citySelect = document.getElementById("city");
	citySelect.addEventListener("change", handleCityChange);

	const neighborhoodSelect = document.getElementById("neighborhood");
	neighborhoodSelect.addEventListener("change", handleNeighborhoodChange);

	const dateSelect = document.getElementById("date");
	dateSelect.addEventListener("change", handleDateChange);
});
