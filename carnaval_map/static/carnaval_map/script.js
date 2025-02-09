document.addEventListener("DOMContentLoaded", () => {
	function createMap(center, zoom) {
		const map = L.map("map").setView(center, zoom);
		L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
			maxZoom: 19,
			attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
		}).addTo(map);

		// Legenda para os ícones
		const legend = L.control({ position: "bottomright" });

		legend.onAdd = function () {
			const div = L.DomUtil.create("div", "info legend");

			// Estilo para a legenda
			div.style.backgroundColor = "white";
			div.style.padding = "10px";
			div.style.borderRadius = "5px";
			div.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.2)";
			div.style.fontSize = "14px";
			div.style.color = "black";

			// Definindo as cores e os ícones para a legenda
			const categories = [
				{ color: "#71AE26", icon: "fa-star", label: "Gratuito - Futuro" },
				{ color: "#71AE26", icon: "fa-history", label: "Gratuito - Passado" },
				{ color: "orange", icon: "fa-star", label: "Pago - Futuro" },
				{ color: "orange", icon: "fa-history", label: "Pago - Passado" }
			];

			categories.forEach((category) => {
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
		return map;
	}

	const freeUpcomingIcon = L.AwesomeMarkers.icon({
		markerColor: "green",
		iconColor: "white",
		icon: "star",
		prefix: "fa",
		extraClasses: "fa-rotate-0"
	});

	const freePastIcon = L.AwesomeMarkers.icon({
		markerColor: "green",
		iconColor: "white",
		icon: "history",
		prefix: "fa",
		extraClasses: "fa-rotate-0"
	});

	const paidUpcomingIcon = L.AwesomeMarkers.icon({
		markerColor: "orange",
		iconColor: "white",
		icon: "star",
		prefix: "fa",
		extraClasses: "fa-rotate-0"
	});

	const paidPastIcon = L.AwesomeMarkers.icon({
		markerColor: "orange",
		iconColor: "white",
		icon: "history",
		prefix: "fa",
		extraClasses: "fa-rotate-0"
	});

	const map = createMap([-22.85, -43.28], 12);
	const cities_coords = JSON.parse(document.getElementById("cities_coords").textContent);

	let markers = [];
	let allBlocos = [];
	let displayedCount = 5;

	function clearMarkers() {
		markers.forEach((marker) => map.removeLayer(marker));
		markers = [];
	}

	function loadBlocos(blocos) {
		allBlocos = blocos;
		renderBlocos();
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

	function updateMarkers(blocos) {
		clearMarkers();
		const filteredBlocos = filterBlocos(); // Filtra os blocos conforme o checkbox

		filteredBlocos.forEach((bloco) => {
			// Verifica se o bloco é gratuito ou pago
			const isFree = bloco.ticket_info === "Grátis";
			const today = new Date();
			const blocoDate = new Date(bloco.event_date);
			const isFuture = blocoDate >= today;

			// Escolher o ícone com base no tipo de bloco (grátis/pago) e no evento (futuro/passado)
			let markerIcon;
			if (isFree) {
				// Bloco gratuito
				markerIcon = isFuture ? freeUpcomingIcon : freePastIcon;
			} else {
				// Bloco pago
				markerIcon = isFuture ? paidUpcomingIcon : paidPastIcon;
			}

			// Criar o marcador com o ícone correto
			const marker = L.marker([bloco.latitude, bloco.longitude], { icon: markerIcon }).addTo(map);

			const eventDate = new Date(bloco.event_date);
			const formattedDate = eventDate.toLocaleDateString("pt-BR", {
				day: "2-digit",
				month: "2-digit"
			});

			ticket_content = "";
			if (bloco.ticket_url) {
				ticket_content = `💲 <a href="${bloco.ticket_url}" target="_blank">${bloco.ticket_info}</a>`;
			} else {
				ticket_content = `<strong>💲 ${bloco.ticket_info}</strong>`;
			}

			see_more_content = `🔍 <a href="${bloco.event_page_url || "#"}" target="_blank">Ver mais...</a>`;

			map_link_content = `🗺️ <a href="${bloco.address_gmaps_url || "#"}" target="_blank">Veja como chegar</a>`;

			whatsapp_text = `${formattedDate} - ${bloco.event_time} Vai acontecer o bloco ${bloco.name} em ${bloco.neighborhood || bloco.city}. ${bloco.event_page_url}`;
			share_whatsapp_content = `📱 <a href="https://wa.me/?text=${whatsapp_text}" target="_blank">Compartilhar no WhatsApp</a>`;

			marker.bindPopup(`
                <div class="marker-popup">
                    <h3>${bloco.name}</h3>

                    <p>${ticket_content}</p>
                    <p>📅 ${formattedDate} ${bloco.event_time}</p>
                    <p>📍 ${bloco.neighborhood || bloco.city} - ${bloco.address || ""}</p>
                    <p class="mt-2">${bloco.description.slice(0, 300) + (bloco.description.length > 300 ? "..." : "")}</p>

                    <p class="mt-2">${see_more_content} ${map_link_content} ${share_whatsapp_content}</p>
                </div>
            `);
			markers.push(marker);
		});
	}

	function renderBlocos() {
		const blocosContainer = document.getElementById("blocos");
		blocosContainer.innerHTML = "";

		const filteredBlocos = filterBlocos(); // Obtém a lista de blocos filtrada

		// Agrupa os blocos por data
		const blocosByDate = {};
		filteredBlocos.forEach((bloco) => {
			const eventDate = new Date(bloco.event_date);
			const formattedDate = eventDate.toLocaleDateString("pt-BR", {
				day: "2-digit",
				month: "2-digit"
			});
			const weekDay = eventDate.toLocaleDateString("pt-BR", { weekday: "long" });

			const dateKey = `${formattedDate} (${weekDay})`;

			if (!blocosByDate[dateKey]) {
				blocosByDate[dateKey] = [];
			}
			blocosByDate[dateKey].push(bloco);
		});

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

				const blocoCard = document.createElement("div");
				blocoCard.classList.add("bloco-card");

				ticket_content = "";
				if (bloco.ticket_url) {
					ticket_content = `💲 <a href="${bloco.ticket_url}" target="_blank">${bloco.ticket_info}</a>`;
				} else {
					ticket_content = `<strong>💲 ${bloco.ticket_info}</strong>`;
				}

				see_more_content = `🔍 <a href="${bloco.event_page_url || "#"}" target="_blank">Ver mais...</a>`;

				map_link_content = `🗺️ <a href="${bloco.address_gmaps_url || "#"}" target="_blank">Veja como chegar</a>`;

				whatsapp_text = `${dateKey} - ${bloco.event_time} Vai acontecer o bloco ${bloco.name} em ${bloco.neighborhood || bloco.city}. ${bloco.event_page_url}`;
				share_whatsapp_content = `📱 <a href="https://wa.me/?text=${whatsapp_text}" target="_blank">Compartilhar no WhatsApp</a>`;

				blocoCard.innerHTML = `
                    <div class="bloco-card-container">
                        <div class="bloco-card-time">
                            <span>${bloco.event_time || "Horário não informado"}</span>
                        </div>
                        <div class="bloco-card-details">
                            <h3>${bloco.name}</h3>
                            <p><strong>📍 ${bloco.neighborhood || bloco.city} - ${bloco.address || ""}</strong> </p>
                            <p>${ticket_content}</p>
                            ${see_more_content}  ${map_link_content}  ${share_whatsapp_content}
                        </div>
                    </div>`;

				dayContainer.appendChild(blocoCard);
				blocoCount++;
			});

			blocosContainer.appendChild(dayContainer);
		});

		// Botão "Carregar Mais"
		if (blocoCount < filteredBlocos.length) {
			const loadMoreButton = document.createElement("button");
			loadMoreButton.textContent = "Carregar Mais";
			loadMoreButton.classList.add("load-more");
			loadMoreButton.addEventListener("click", () => {
				displayedCount += 5;
				renderBlocos();
			});
			blocosContainer.appendChild(loadMoreButton);
		}

		updateMarkers(); // Atualiza os marcadores no mapa conforme os blocos visíveis
	}

	document.getElementById("past-events").addEventListener("change", renderBlocos);

	const blocos = JSON.parse(document.getElementById("blocos-json").textContent);
	loadBlocos(blocos);

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

	const citySelect = document.getElementById("city");
	citySelect.addEventListener("change", (event) => {
		const selectedCity = event.target.value;
		const cityData = cities_coords.find((city) => city.name === selectedCity);

		if (cityData) {
			map.setView([cityData.avg_latitude, cityData.avg_longitude], 9);
		} else {
			map.setView([-22.85, -43.28], 10);
		}

		fetch(`/filter-blocos/?city=${selectedCity}`)
			.then((response) => response.json())
			.then((data) => {
				if (data.blocos) {
					loadBlocos(data.blocos);
				}
				if (data.dates) {
					updateDateFilter(data.dates);
				}
				if (data.neighborhoods) {
					updateNeighborhoodFilter(data.neighborhoods);
				}
			})
			.catch((error) => console.error("Erro na requisição:", error));
	});

	const neighborhoodSelect = document.getElementById("neighborhood");
	neighborhoodSelect.addEventListener("change", (event) => {
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
	});

	const dateSelect = document.getElementById("date");
	dateSelect.addEventListener("change", (event) => {
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
	});
});
