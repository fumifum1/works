# Privacy Notes

The application does not intentionally send these values to analytics:

- date of birth
- target date
- GPS coordinates
- directional result
- nine-star result

External services used when enabled:

1. OpenStreetMap tile server
   Receives normal web-request information required to deliver map tiles, such as IP address and requested tile coordinates.

2. Google Analytics 4
   Loaded only when a Measurement ID is entered in `config.js`. Standard analytics data may be processed by Google.

GPS:

- Requested only when the user presses the GPS button.
- Denial or no action uses Tokyo Station.
- Coordinates are retained only in the open page's JavaScript memory.
