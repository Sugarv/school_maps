import { INITIAL_LAT, INITIAL_LONG, LOCATIONS_FILE, POLYGONS_FILE } from './params.js';

var map = L.map('map').setView([INITIAL_LAT, INITIAL_LONG], 13); // Adjust coordinates as needed

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 28,
}).addTo(map);

var addressInput = $('#addressInput');
var marker;

addressInput.select2({
  placeholder: 'Εισάγετε ταχυδρομική διεύθυνση',
  ajax: {
    url: 'https://nominatim.openstreetmap.org/search',
    dataType: 'json',
    delay: 250,
    data: function(params) {
      var viewBounds = map.getBounds();
      return {
        q: params.term,
        format: 'json',
        bounded: 1,
        viewbox: viewBounds.getWest() + ',' + viewBounds.getSouth() + ',' + viewBounds.getEast() + ',' + viewBounds.getNorth(),
        accept_language: 'el'
      };
    },
    processResults: function(data) {
      return {
        results: $.map(data, function(item) {
          return {
            id: item.place_id,
            text: item.display_name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
          };
        })
      };
    },
    cache: true
  },
  minimumInputLength: 3,
  language: {
    inputTooShort: function() {
      return "Παρακαλώ εισάγετε 3 ή περισσότερους χαρακτήρες";
    }
  }
});

// add school locations as a points layer and display school name on click
function addPointsLayer() {
  var pointsGeoJSON = LOCATIONS_FILE;
  $.getJSON(pointsGeoJSON, function(data) {
    var pointsLayer = L.geoJSON(data, {
      pointToLayer: function(feature, latlng) {
        return L.marker(latlng, {
          icon: L.icon({
            iconUrl: 'images/school.png', // Path to your building icon image
            iconSize: [32, 32], // Adjust the size of the icon if needed
            iconAnchor: [16, 32], // Adjust the anchor point of the icon if needed
          })
        });
      },
      onEachFeature: function(feature, layer) {
        layer.on('click', function(e) {
          var popupContent = feature.properties.geozone_title;
          layer.bindPopup(popupContent).openPopup();
        });
      }
    }).addTo(map);
  });
}

// Add points layer to the map
addPointsLayer();

var allPolygons = []; // Store all polygons globally

// Function to add school polygons to the map
function addPolygons() {
    var polygons = [POLYGONS_FILE];

    for (var i = 0; i < polygons.length; i++) {
        (function(index) {
          $.getJSON(polygons[index], function(data) {
            if (!data || !Array.isArray(data.features)) {
                console.error("Invalid GeoJSON data:", data);
                return;
            }
        
            var features = data.features
                .filter(feature => feature.properties && feature.properties.name) // Ensure valid properties
                .sort((a, b) => a.properties.name.localeCompare(b.properties.name));
        
            var geojsonLayer = L.geoJSON(features, {
                style: function(feature) {
                    var colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8000', '#008000', '#800080', '#808080', '#ff0080', '#00ff80'];
                    var colorIndex = feature.properties.cartodb_id % colors.length;
                    return {
                        fillColor: colors[colorIndex],
                        fillOpacity: 0.2,
                        color: 'black',
                        weight: 1
                    };
                },
                onEachFeature: function(feature, layer) {
                    if (layer instanceof L.Polygon) {
                        var tableRow = $('<tr>');
                        var tableCell = $('<td>').text(feature.properties.name);
                        tableRow.append(tableCell);
                        tableRow.on('click', function() {
                            $('#polygonTable tbody tr.active').removeClass('active table-primary');
                            $(this).addClass('active table-primary');
                            map.fitBounds(layer.getBounds());
                        });
        
                        $('#polygonTable tbody').append(tableRow);
                    }
                }
            }).addTo(map);
        
            allPolygons.push(geojsonLayer);
          });
        })(i);
    }
}

// Function to check if a location is inside a polygon
function checkPolygon(latlng) {
  $('#result').html('');

  let foundResult = null;

  allPolygons.forEach(geojsonLayer => {
      geojsonLayer.eachLayer(layer => {
          if (layer instanceof L.Polygon) {
              var point = [latlng.lng, latlng.lat];

              // Convert layer to GeoJSON format
              var poly = layer.toGeoJSON();

              // Check if the point is inside the polygon using leafletPip
              if (leafletPip.pointInLayer(point, L.geoJSON(poly)).length > 0) {
                  foundResult = {
                      name: layer.feature.properties.name,
                      data: {
                          address: layer.feature.properties.address,
                          telephone: layer.feature.properties.telephone,
                          email: layer.feature.properties.email
                      }
                  };
              }
          }
      });
  });

  if (foundResult) {
      const theMessage = `Η επιλεγμένη τοποθεσία ανήκει στο σχολείο: <br><b>${foundResult.name}</b><br>Δ/νση: ${foundResult.data.address}<br>Τηλ.: ${foundResult.data.telephone}<br>email: ${foundResult.data.email}`;
      $('#result').html(theMessage);

      // Trigger click event on the corresponding table row
      var selectedRow = $('#polygonTable tbody tr:contains("' + foundResult.name + '")');
      selectedRow.click();

      // Scroll the table to bring the selected row into view
      selectedRow[0].scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
  } else {
      const theMessage = 'H επιλεγμένη τοποθεσία δεν ανήκει σε κάποιο σχολείο...';
      $('#result').html(theMessage);
  }
}

function shortenAddress(data) {
  let addr = '';
  if (data.address.road) {
    addr += data.address.road + ', ';
  }
  if (data.address.postcode) {
    addr += data.address.postcode + ', '; 
  }
  if (data.address.city) {
    addr += data.address.city + ', ';
  }
  return addr;
}


// Event listener for map click
map.on('click', function(e) {
  var latlng = e.latlng;
    var zoom = map.getZoom();

    var geocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&zoom=18&addressdetails=1`;
    $.getJSON(geocodeUrl, function(data) {
      var address = shortenAddress(data);
  
      var popupContent = `Επιλεγμένη διεύθυνση: ${address}`;
      if (marker) {
        marker.setLatLng(latlng)
          .setPopupContent(popupContent)
          .openPopup();
      } else {
        marker = L.marker(latlng)
          .bindPopup(popupContent)
          .addTo(map)
          .openPopup();
      }
      // Reset the address input
      addressInput.val(null).trigger('change');
    });

    map.setView(latlng, zoom);
    checkPolygon(e.latlng);
});

addressInput.on('select2:select', function(e) {
  var data = e.params.data;
  var latlng = L.latLng(data.lat, data.lon);
  map.setView(latlng, 18);
  checkPolygon(latlng);
  if (marker) {
    map.removeLayer(marker);
  }
  marker = L.marker(latlng)
      .bindPopup(data.text)
      .addTo(map)
      .openPopup();
});

// Load polygons when the page loads
$(document).ready(function() {
    addPolygons();
});
