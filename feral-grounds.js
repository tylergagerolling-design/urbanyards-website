const mapElement = document.querySelector("#feral-habitat-map");
const card = document.querySelector(".feral-site-card");
const layerButtons = [...document.querySelectorAll(".feral-layer-toggle")];
const siteDropButton = document.querySelector(".feral-site-drop");

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

  const updateCard = ({ label, title, detail }) => {
    if (!card) return;
    window.clearTimeout(card.hideTimer);
    card.classList.remove("is-hidden");
    card.innerHTML = `<p class="eyebrow">${label}</p><h2>${title}</h2><p>${detail}</p>`;
  };
  const hideCardSoon = () => {
    if (!card || dropMode) return;
    window.clearTimeout(card.hideTimer);
    card.hideTimer = window.setTimeout(() => card.classList.add("is-hidden"), 2000);
  };

  const layers = {
    canopy: L.layerGroup(),
    pollinator: L.layerGroup(),
    soil: L.layerGroup(),
    water: L.layerGroup(),
    community: L.layerGroup(),
  };

  const layerStyles = {
    canopy: { color: "#6f906e", fillColor: "#6f906e" },
    pollinator: { color: "#a85d5e", fillColor: "#9e3438" },
    soil: { color: "#9a9366", fillColor: "#9a9366" },
    water: { color: "#6b8f8a", fillColor: "#6b8f8a" },
    community: { color: "#d0c493", fillColor: "#d0c493" },
  };

  const zoneData = [
    {
      layer: "canopy",
      label: "Canopy",
      title: "North Portland Canopy Thread",
      detail: "Street-edge tree pockets could connect shade, cooling, and bird movement between neighborhood corridors.",
      center: [45.558, -122.667],
      radius: 4300,
    },
    {
      layer: "pollinator",
      label: "Pollinator",
      title: "Inner Eastside Nectar Route",
      detail: "Small flowering patches can act as stepping stones for pollinators across tight urban blocks.",
      center: [45.513, -122.648],
      radius: 3600,
    },
    {
      layer: "soil",
      label: "Soil",
      title: "South Portland Soil Repair",
      detail: "Compacted margins and leftover parcels could become test plots for mulch, fungi, and native understory recovery.",
      center: [45.472, -122.673],
      radius: 3900,
    },
    {
      layer: "water",
      label: "Water",
      title: "Columbia Slough Edge",
      detail: "Moisture-loving habitat can strengthen drainage edges while supporting birds and amphibians.",
      center: [45.588, -122.666],
      radius: 4800,
    },
    {
      layer: "community",
      label: "Community",
      title: "Neighborhood Planting Commons",
      detail: "Highly visible planting days could turn underused corners into shared stewardship sites.",
      center: [45.518, -122.713],
      radius: 3300,
    },
  ];

  zoneData.forEach((zone) => {
    const colors = layerStyles[zone.layer];
    const circle = L.circle(zone.center, {
      color: colors.color,
      fillColor: colors.fillColor,
      fillOpacity: 0.16,
      opacity: 0.78,
      radius: zone.radius,
      weight: 2,
    });
    circle.bindTooltip(zone.label, {
      className: "feral-zone-label",
      direction: "center",
      permanent: false,
    });
    circle.on("mouseover", () => {
      circle.setStyle({ fillOpacity: 0.32, opacity: 1, weight: 3 });
      updateCard(zone);
    });
    circle.on("mouseout", () => {
      circle.setStyle({ fillOpacity: 0.16, opacity: 0.78, weight: 2 });
      hideCardSoon();
    });
    circle.on("click", () => updateCard(zone));
    circle.addTo(layers[zone.layer]);
  });

  Object.values(layers).forEach((layer) => layer.addTo(map));

  layerButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const layerName = button.dataset.layer;
      const layer = layers[layerName];
      if (!layer) return;
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
        button.classList.remove("is-active");
      } else {
        layer.addTo(map);
        button.classList.add("is-active");
      }
    });
  });

  let dropMode = false;
  let suggestedMarker;
  siteDropButton?.addEventListener("click", () => {
    dropMode = !dropMode;
    siteDropButton.classList.toggle("is-active", dropMode);
    updateCard({
      label: "Suggest Site",
      title: dropMode ? "Click the map to drop a pin." : "Suggestion mode paused.",
      detail: dropMode ? "Choose a potential future planting location. This is a visual draft and does not submit anywhere yet." : "Tap Suggest Site again to place a draft location.",
    });
  });

  map.on("click", (event) => {
    if (!dropMode) return;
    if (suggestedMarker) map.removeLayer(suggestedMarker);
    suggestedMarker = L.circleMarker(event.latlng, {
      className: "feral-suggested-pin",
      color: "#d0c493",
      fillColor: "#9e3438",
      fillOpacity: 0.86,
      radius: 10,
      weight: 2,
    }).addTo(map);
    updateCard({
      label: "Suggested Site",
      title: "Future planting location",
      detail: `<strong>${event.latlng.lat.toFixed(4)}, ${event.latlng.lng.toFixed(4)}</strong><br>Draft pin placed locally for visual planning.`,
    });
    dropMode = false;
    siteDropButton?.classList.remove("is-active");
  });
}
