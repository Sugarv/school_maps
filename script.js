import { INITIAL_LAT, INITIAL_LONG, LOCATIONS_FILE, POLYGONS_FILE } from './params.js';

$(document).ready(function() {
  var map = L.map('map').setView([INITIAL_LAT, INITIAL_LONG], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
    maxZoom: 18,
  }).addTo(map);


  var addressInput = $('#addressInput');
  var marker;
  var popup;

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
    minimumInputLength: 1,
    language: {
      inputTooShort: function() {
        return "Παρακαλώ εισάγετε 1 ή περισσότερους χαρακτήρες";
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

  // Function to add school polygons to the map
  function addPolygons() {
    var polygons = [POLYGONS_FILE];
    for (var i = 0; i < polygons.length; i++) {
      (function(index) {
        $.getJSON(polygons[index], function(data) {
          var geojsonLayer = L.geoJSON(data, {
            style: function(feature) {
              // Define an array of colors
              var colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8000', '#008000', '#800080', '#808080', '#ff0080', '#00ff80'];
  
              // Assign a color based on the feature index
              var colorIndex = feature.properties.cartodb_id % colors.length;
              var color = colors[colorIndex];
  
              // Return the style object
              return {
                fillColor: color,
                fillOpacity: 0.2,
                color: 'black',
                weight: 1
              };
            },
            onEachFeature: function(feature, layer) {
              if (layer instanceof L.Polygon) {
                // Create a table row for each polygon
                var tableRow = $('<tr>');
                var tableCell = $('<td>').text(feature.properties.name);
                tableRow.append(tableCell);
                tableRow.on('click', function() {
                  map.fitBounds(layer.getBounds());
                });
  
                // Append the table row to the polygonTable
                $('#polygonTable tbody').append(tableRow);
              }
            }
          }).addTo(map);
        });
      })(i);
    }
  }

  // Function to check if a location is inside a polygon
  function checkPolygon(latlng) {
    var polygons = [POLYGONS_FILE];
    var promises = [];

    $('#result').html('');

    for (var i = 0; i < polygons.length; i++) {
        promises.push(new Promise(function (resolve) {
            $.getJSON(polygons[i], function (data) {
                var geojsonLayer = L.geoJSON(data);
                geojsonLayer.eachLayer(function (layer) {
                    if (layer instanceof L.Polygon && layer.getBounds().contains(latlng)) {
                        resolve({
                            name: layer.feature.properties.name,
                            data: {
                                address: layer.feature.properties.address,
                                telephone: layer.feature.properties.telephone,
                                email: layer.feature.properties.email
                            }
                        });
                    }
                });
                resolve(null);
            });
        }));
    }

    Promise.all(promises).then(function (results) {
        var foundResult = results.find(result => result !== null);

        if (foundResult) {
            const theMessage = `Η επιλεγμένη τοποθεσία ανήκει στο σχολείο: <br><b>${foundResult.name}</b><br>Δ/νση: ${foundResult.data.address}<br>Τηλ.: ${foundResult.data.telephone}<br>email: ${foundResult.data.email}`;
            $('#result').html(theMessage);
        } else {
            const theMessage = 'H επιλεγμένη τοποθεσία δεν ανήκει σε κάποιο σχολείο...';
            $('#result').html(theMessage);
        }
    });
  }
  
  // Add polygons to the map
  addPolygons();

  function openPopupWithAddress(address, latlng) {
    if (popup) {
      popup.setLatLng(latlng).setContent(address).openOn(map);
    } else {
      popup = L.popup({ closeButton: true })
        .setLatLng(latlng)
        .setContent(address)
        .openOn(map);
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

  // Event handler for address selection
  addressInput.on('select2:select', function(e) {
    var data = e.params.data;
    var latlng = L.latLng(data.lat, data.lon);
    var zoom = map.getZoom();
    map.setView(latlng, 24);
    checkPolygon(latlng);
    if (marker) {
      map.removeLayer(marker);
    }
    marker = L.marker(latlng).addTo(map);
    openPopupWithAddress(data.text, latlng);
  });

  // Event handler for map click
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
        openPopupWithAddress(address, latlng);
      } else {
        marker = L.marker(latlng)
          .bindPopup(popupContent)
          .addTo(map)
          .openPopup();
        openPopupWithAddress(address, latlng);
      }
      // Reset the address input
      addressInput.val(null).trigger('change');
    });

    map.setView(latlng, zoom);
    checkPolygon(latlng);

  });
});
