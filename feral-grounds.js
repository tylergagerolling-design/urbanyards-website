const mapElement = document.querySelector("#feral-habitat-map");

if (mapElement && window.L) {
  const portland = [45.5152, -122.6784];
  const map = L.map(mapElement, {
    attributionControl: true,
    center: portland,
    dragging: true,
    scrollWheelZoom: false,
    tap: true,
    zoom: 11,
    zoomControl: true,
  });

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);
}
