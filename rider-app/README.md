# Reflex Rider App (Flutter)

## Important caveat, upfront
Flutter code can't be compiled or run in the environment this was built in — no Flutter SDK available. Everything below was carefully hand-reviewed (structure, imports, bracket balance all checked) but not verified with flutter analyze or a real build. Run that yourself before trusting this compiles.

## Files here
- pubspec.yaml — dependencies: geolocator (GPS), connectivity_plus (offline detection), shared_preferences (offline queue storage), http, provider
- lib/services/task_api_client.dart — talks to the Reflex backend, including login() for JWT auth (required as of v2)
- lib/services/offline_queue.dart — queues pickup/confirm actions locally when offline, replays them in order once connectivity returns
- lib/services/location_service.dart — periodic GPS reporting while a delivery is active (backend endpoint now live: POST /riders/:id/location)

## What's NOT built yet
- No actual screens/UI — just the service layer. Build the rider's screens next, similar to the Rider tab in frontend/index.html (which already has a working login flow to reference).
- No local persistence of the login token yet (matches the web frontend's current in-memory-only approach) — closing the app logs the rider out.

## To actually build this
```
flutter create . --project-name reflex_rider_app
flutter pub get
flutter analyze
flutter run
```

## Suggested order of work
1. Confirm the service layer compiles (flutter analyze)
2. Build a login screen calling ReflexApiClient.login(name, password)
3. Build the delivery list screen, wiring in OfflineQueue and LocationService
4. Test offline behavior for real: airplane mode, mark picked up, confirm it queues; reconnect, confirm it syncs
