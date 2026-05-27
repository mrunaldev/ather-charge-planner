# Ather Charge Planner

A lightweight web app for planning Ather scooter charging schedules.

The app stores settings in browser local storage and uses a responsive dark UI with a black-and-white calendar plus thunder logo.

## Project Structure

- `index.html` - App markup and metadata
- `assets/css/styles.css` - Responsive layout and visual styling
- `assets/js/app.js` - Charging calculations, setup, validation, and calibration
- `assets/app-icon.svg` - Source app icon
- `assets/apple-touch-icon.png` - iOS home-screen icon
- `site.webmanifest` - Installable app metadata
- `tests/` - Reusable functional and static checks

## Features

### When To Charge

Enter:
- Current charge percentage
- Target charge percentage
- Target completion time

Get:
- The exact time to plug in
- A warning if the target time is too soon
- Optimized charging guidance when enabled

If the selected target time has already passed today, the app treats it as the same time tomorrow.

### Forecast

Enter:
- Current charge percentage
- Future target time

Get:
- Estimated battery percentage by that time
- Estimates capped at 100%

If the selected forecast time has already passed today, the app treats it as the same time tomorrow.

### Calibrate

Enter three charging observations:
- Sample time
- Battery percentage at that time

Get:
- Average charging speed in `%/hour`
- Charging quality rating
- Per-sample charging rate comparison

The calibrated rate is saved in browser local storage and used for future schedule and forecast calculations.

### Setup

Save:
- Ather model
- Charging mode
- Charger type
- Charger purchase date

Settings are saved in browser local storage. Updating settings clears the previous calibrated rate.

## Charging Modes

### Regular

Calculates charging time directly from current charge to target charge.

### Optimized

When the target is above 80%, the app calculates charging to 80% first and notes that final charging should be delayed to reduce battery stress.

## Supported Models

- Ather 450 2.9
- Ather 450 3.7
- Ather Rizta 2.9
- Ather Rizta 3.7

Models with `3.7` auto-select the Duo Charger. Other models auto-select the Standard Portable Charger.

## Supported Chargers

- Standard Portable Charger `(350W)` - default rate: `10%/hour`
- Duo Charger `(700W)` - default rate: `20%/hour`

If calibration is saved, the calibrated rate overrides the charger default.

## Validation

The app checks for:
- Empty or invalid percentage values
- Negative percentages
- Percentages above 100%
- Target charge lower than current charge
- Missing target times
- Target times that are not in the future
- Calibration samples that are not in ascending time order
- Calibration battery percentages that do not increase over time

## Tests

Run the reusable test suite from the project root:

```bash
./tests/run-tests.sh
```

The suite checks charging calculations, setup behavior, validation, calibration, next-day time handling, linked assets, manifest validity, and modular HTML structure.

## Works On

- iPhone
- Android
- Mac
- Windows
- Linux

## Deploy

1. Create a GitHub repository.
2. Upload:
   - `index.html`
   - `assets/`
   - `site.webmanifest`
   - `README.md`
3. Open `Settings > Pages`.
4. Select `Main branch > Root`.

The app can also be hosted on Netlify or Vercel because it is a static HTML page.

## Author

Mrunal Kanta Muduli
