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

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
    subdomains: "abcd",
  }).addTo(map);

  const corridors = [
    [[45.5515, -122.755], [45.535, -122.714], [45.523, -122.681], [45.512, -122.642], [45.506, -122.607]],
    [[45.573, -122.705], [45.548, -122.682], [45.525, -122.666], [45.493, -122.642]],
    [[45.503, -122.76], [45.511, -122.716], [45.514, -122.681], [45.52, -122.631], [45.528, -122.585]],
    [[45.47, -122.69], [45.492, -122.674], [45.517, -122.658], [45.546, -122.64]],
  ];

  corridors.forEach((corridor) => {
    L.polyline(corridor, {
      color: "#9e3438",
      opacity: 0.28,
      weight: 10,
      lineCap: "round",
      lineJoin: "round",
      interactive: false,
    }).addTo(map);
    L.polyline(corridor, {
      color: "#6f906e",
      opacity: 0.88,
      weight: 4,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(map);
  });

  const projects = [
    { label: "Pollinator Corridor", point: [45.5231, -122.6765] },
    { label: "Habitat Patch", point: [45.5595, -122.6506] },
    { label: "Community Planting Site", point: [45.5051, -122.6208] },
    { label: "Future Canopy Zone", point: [45.4837, -122.6989] },
  ];

  projects.forEach(({ label, point }) => {
    L.circleMarker(point, {
      className: "feral-project-marker",
      color: "#d0c493",
      fillColor: "#6f906e",
      fillOpacity: 0.86,
      opacity: 1,
      radius: 9,
      weight: 2,
    })
      .bindPopup(`<span class="feral-popup-accent" aria-hidden="true"></span>${label}`)
      .addTo(map);
  });
}
