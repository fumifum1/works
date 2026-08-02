# Kippoui Navi v1.5.3

## Important

Do not open the old Japanese-named package. This package uses ASCII filenames only.

## Windows start

Double-click:

`start-windows.bat`

The browser opens at:

`http://localhost:8080`

Leave the black command window open while using the site. Close it to stop the local server.

Directly opening `index.html` is possible for basic display, but browser geolocation may be blocked on `file://`.
GPS normally requires HTTPS or localhost.

## Features

- Single-person reading with personality tendencies and eight-direction reasons
- Twelve solar-month overview for one selected year
- Combined direction reading for two to six people
- Responsive editorial layout based on `kippoui-site-design.md`
- All personal inputs and fortune calculations stay in the open browser page

## Reading rules

- The simplified reading uses year and month plates. Time is treated as noon.
- Annual rows begin at Risshun and use the midpoint of each solar month.
- In a group reading, a direction is "avoid" if it is unfavorable for anyone, "good for all" only if it is favorable for everyone, and otherwise neutral.

## Map

- Default origin: Tokyo Station
- The initial view is fitted to show all of Japan
- Press "地図から起点を選ぶ" before clicking the map to set any point as the origin
- A normal map click outside that explicit mode does not change the origin
- GPS is requested only after pressing "現在地"
- If permission is denied, Tokyo Station remains the origin
- OpenStreetMap tiles are loaded over the internet
- Date of birth, coordinates and results are not included in tile requests by this application

## Analytics

Edit `config.js`:

```js
window.APP_CONFIG = {
  gaMeasurementId: "G-XXXXXXXXXX"
};
```

Leave the value empty to disable analytics.

This implementation sends only standard GA4 page-view information. It does not create custom events containing birth dates, GPS coordinates or fortune results.

Because GA4 is an external service, update the public privacy policy and configure consent handling if required by the regions where the site is offered.

## Files

- `index.html`
- `styles.css`
- `app.js`
- `config.js`
- `start-windows.bat`
- `start-powershell.ps1`
- `README.md`

## Codex editing

Open this folder as a local folder/repository in Codex. Ask Codex to run `start-windows.bat` or `python -m http.server 8080`, inspect the page, edit files and test changes.
