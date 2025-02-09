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
            const marker = L.marker([bloco.latitude, bloco.longitude]).addTo(map);
            marker.bindPopup(`
                <h3>${bloco.name}</h3>
                <p>${bloco.description}</p>
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
                    ticket_content = `💲 <a href="${bloco.ticket_url}" target="_blank">${bloco.ticket_info}</a>`
                } else {
                    ticket_content = `<strong>💲 ${bloco.ticket_info}</strong>`
                }

                see_more_content = `🔍 <a href="${bloco.event_page_url || "#"}" target="_blank">Ver mais...</a>`

                map_link_content = `🗺️ <a href="${bloco.address_gmaps_url || "#"}" target="_blank">Veja como chegar</a>`

                whatsapp_text = `${dateKey} - ${bloco.event_time} Vai acontecer o bloco ${bloco.name} em ${bloco.neighborhood || bloco.city}. ${bloco.event_page_url}`
                share_whatsapp_content = `📱 <a href="https://wa.me/?text=${whatsapp_text}" target="_blank">Compartilhar no WhatsApp</a>`


                blocoCard.innerHTML = `
                    <div class="bloco-card-container">
                        <div class="bloco-card-time">
                            <span>${bloco.event_time || "Horário não informado"}</span>
                        </div>
                        <div class="bloco-card-details">
                            <h3>${bloco.name}</h3>
                            <p><strong>📍 ${bloco.neighborhood || bloco.city}</strong> </p>
                            <p>${ticket_content}</p>
                            ${see_more_content}  ${map_link_content}  ${share_whatsapp_content}
                        </div>
                    </div>`
                ;

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
