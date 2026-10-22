# spot-alert: design notes

## Goal
Rate conditions at the user's saved windsurf spots for the next 8 days, near a chosen location (GPS optional, manual location always possible), within a max distance in km.

## Spot model
- lat/lon, name
- One or more **condition sets** (e.g. "NW wind with swell", "SW wind flat"); the spot's score is the best match among them
- Per condition set, per factor: a **usable range** and an **ideal range** (ideal is inside usable)
  - wind speed (kn), wind direction (arc, degrees)
  - wave height (m), wave direction (arc)
  - optional: wave period, gusts
- Factors the user leaves unset are skipped entirely
- Wave source selectable (total / wind waves / swell) because North Sea swell and wind sea differ; for the Baltic waves mostly follow the wind
- Reserve room for a tide window later

## Scoring (per hour)
1. **Per-factor score (0-1)**
   - inside ideal range: 1.0
   - between ideal and usable edge: linear ramp from 1.0 down to a floor of ~0.5 (so 25 kn beats 19 kn in a 17-30 kn range with ideal 24-28)
   - just outside usable: soft fall from the floor to 0 over a small margin (~20 deg for direction, ~3 kn for speed)
   - directions use circular distance to the arc (wrap-around at 360 deg)
   - presets for ideal range: more is better / less is better / middle / don't care (ideal = usable)
2. **Gates** (wind direction, minimum wind, maximum wave height): if outside usable, the hour's score is capped low regardless of other factors (safety, e.g. offshore wind)
3. **Quality factors**: weighted geometric mean, score = exp(sum(w_i * ln(s_i)) / sum(w_i)). Weights from importance low/normal/high (start with 0.5 / 1 / 2). Unset factors are omitted from both the product and the weight sum. Clamp each factor to >= ~0.05 to avoid ln(0). Why geometric: one bad factor drags the result down, and the n-th root keeps spots with few and many factors comparable.

## Scoring (per day)
- Only daylight hours (use sunrise/sunset from Open-Meteo daily data)
- **Core window**: best 3 consecutive hours by average hourly score, minus a small volatility penalty (steady 22 kn beats 15 -> 30 kn)
- **Extension**: add the hour before/after if its score is >= ~85% of the **core** average (anchor to the core, not the running average) and above an absolute floor (~50-60 on a 0-100 scale). Repeat until neither side qualifies. Gated hours never join. Optional later check: extended window average >= ~90% of core.
- **Headline** = core score + window time range shown beside it. Days are **sorted by core score**; duration is shown but gives no bonus (can add a small capped bonus later if the ranking feels wrong).
- Edge cases: ties for best window (prefer longest extension, then nearest midday); two separate windows in one day (headline the best, optionally flag the second); short winter days; days 5-8 have coarse time precision, so round the window to ~1-2 h or show "afternoon"
- UI shows an hourly colour bar per day and the weakest factor as a "why" (e.g. "wind direction off by 25 deg")

## Data: Open-Meteo
- Forecast API: wind speed (`wind_speed_unit=kn`), gusts, direction; Marine API: wave height/direction/period, wind-wave and swell components
- High-resolution regional model (e.g. ICON-D2) for days 1-2, global model (ECMWF/GFS) for days 3-8; lower confidence for later days
- Coastal/bay cells can return missing wave data (western Baltic): check `cell_selection`; when wave data is null, skip the wave factor and flag "no wave data"
- Cache by rounded coordinates (~0.1 deg); no API key for non-commercial use, commercial plan needed before publishing
- Later: ensemble API for confidence on days 5-8 (check whether marine ensembles exist)

## PWA / offline
- HTTPS static hosting, manifest (`display: standalone`), service worker via vite-plugin-pwa
- App files: cache-first; forecasts: network-first with fallback to last cached forecast and an "updated X h ago" label; map tiles are not cached by default (list view works offline)
- iOS: installed PWA has storage separate from Safari (hence JSON export/import); test geolocation in standalone mode early; push needs iOS 16.4+ installed PWA plus a backend

## Later (see issue #10)
Capacitor wrapper, iOS widget (Swift/WidgetKit; scoring port to Swift vs small backend), push notifications, ensemble confidence, session log (rate sessions to seed ranges), tide windows, sail/board suggestions, other sports as presets on the same engine, public spot database, licensing/safety disclaimer.
