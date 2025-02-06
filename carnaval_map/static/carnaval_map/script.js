console.log("Olá mundo!");
document.addEventListener('DOMContentLoaded', () => {
    function createMap(center, zoom) {
        const map = L.map('map').setView(center, zoom);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);
        return map;
    }

    const map = createMap([-22.85, -43.28], 12);

    const blocos = JSON.parse(document.getElementById('blocos').textContent);

    blocos.forEach(bloco => {
        const marker = L.marker([bloco.latitude, bloco.longitude]).addTo(map);
        marker.bindPopup(`
            <h3>${bloco.name}</h3>
            <p>${bloco.description}</p>
        `);
    });


});