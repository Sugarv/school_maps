# School maps
### Discover your local school

A geolocation project to discover your children's assigned school, depending on your home address. 

- Uses Leaflet.js to render on maps
- Uses geojson files to display school area polygons & locations.
- Uses Openstreetmap API to search for addresses

---

### Ένα project για τον εντοπισμό του σχολείου που ανήκει ένα παιδί, σε συνάρτηση με τη διεύθυνση κατοικίας του.

Χρησιμοποιεί τους δωρεάν χάρτες του [OpenStreetMap](https://www.openstreetmap.org) και τη βιβλιοθήκη [Leaflet.js](https://leafletjs.com).

Παράμετροι που πρέπει να αλλάξουν στο αρχείο params.js (βλ.params-sample.json):

1. Οι περιοχές και οι τοποθεσίες των σχολείων αντλούνται από τοπικά αρχείο geojson (τοποθετούνται στο φάκελο data) ως εξής:
- POLYGONS_FILE: το αρχείο που περιέχει τα πολύγωνα των περιοχών ευθύνης των σχολείων
- LOCATIONS_FILE: το αρχείο που περιέχει τα σημεία με τις τοποθεσίες των σχολείων
2. Οι αρχικές συντεταγμένες με τις οποίες θα αρχικοποιηθεί ο χάρτης: INITIAL_LAT, INITIAL_LONG.

ΣΗΜ: Τα αρχεία geojson μπορούν να δημιουργηθούν π.χ. με το Google Maps ή έναν online editor όπως το [Geojson](https://geojson.io).
