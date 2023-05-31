$(document).ready(function() {
  var map = L.map('map').setView([35.341846, 25.148254], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
    maxZoom: 18,
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
        };
      },
      processResults: function(data) {
        return {
          results: $.map(data, function(item) {
            return {
              id: item.place_id,
              text: item.display_name,
              lat: parseFloat(item.lat),
              lon: parseFloat(item.lon)
            };
          })
        };
      },
      cache: true
    },
    minimumInputLength: 1
  });

  // Function to add polygons to the map
  function addPolygons() {
    var polygons = ['nipiagogeia_02_2022.geojson'];
    for (var i = 0; i < polygons.length; i++) {
      $.getJSON(polygons[i], function(data) {
        var polygon = L.geoJSON(data).addTo(map);
        polygon.on('click', function(e) {
          var latlng = e.latlng;
          var polygonName = data.features[0].properties.name; // Update this line to access the correct nested property
          if (marker) {
            map.removeLayer(marker);
          }
          marker = L.marker(latlng).addTo(map);
          
          $('#result').html('Σχολείο: ' + polygonName);
        });
      });
    }
  }

  // Function to check if a location is inside a polygon
  function checkPolygon(latlng) {
    var polygons = ['nipiagogeia_02_2022.geojson'];
    var isInsidePolygon = false;
    var polygonName = '';
  
    for (var i = 0; i < polygons.length; i++) {
      (function(index) {
        $.getJSON(polygons[index], function(data) {
          var geojsonLayer = L.geoJSON(data);
          geojsonLayer.eachLayer(function(layer) {
            if (layer instanceof L.Polygon && layer.getBounds().contains(latlng)) {
              isInsidePolygon = true;
              polygonName = layer.feature.properties.name;
            }
          });
          // console.log(polygonName);
          if (isInsidePolygon) {
            const theMessage = `Η τοποθεσία ανήκει στο σχολείο: ${polygonName}`;
            $('#result').html(theMessage);
          } else {
            const theMessage = 'H τοποθεσία δεν ανήκει σε κάποιο σχολείο...';
            $('#result').html(theMessage);
          }
        });
      })(i);
    }
  }
  
  // Add polygons to the map
  addPolygons();

  // Event handler for address selection
  addressInput.on('select2:select', function(e) {
    var data = e.params.data;
    var latlng = L.latLng(data.lat, data.lon);
    var zoom = map.getZoom(); // Get the current zoom level
    map.setView(latlng, zoom);
    checkPolygon(latlng);
    if (marker) {
      map.removeLayer(marker);
    }
    marker = L.marker(latlng).addTo(map);
    $('#result').html('');
  });

  // Event handler for map click
  map.on('click', function(e) {
    var latlng = e.latlng;
    var zoom = map.getZoom(); // Get the current zoom level
    map.setView(latlng, zoom);
    
    checkPolygon(latlng, function(polygonName) {
      var address = $('#addressInput').select2('data')[0].text;
      var popupContent = `Η ταχ.διεύθυνση ${address} ανήκει στο σχολείο: ${polygonName}`;
      console
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
    });
    $('#result').html('');
  });
});
