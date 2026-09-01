# Starter: feature/native-rider-app

## Important caveat, upfront
Flutter code can't be compiled or run in the environment this was built in — no Flutter SDK available. Everything below was carefully hand-reviewed (structure, imports, bracket balance all checked) but not verified with flutter analyze or a real build. Run that yourself before trusting this compiles.

## Files here
- pubspec.yaml — dependencies: geolocator (GPS), connectivity_plus (detect online/offline), shared_preferences (persist the offline queue to disk)
- lib/services/task_api_client.dart — talks to the Reflex backend (same endpoints as the web frontend)
- lib/services/offline_queue.dart — the core new capability: queues pickup/confirm actions locally when offline, replays them in order once connectivity returns
- lib/services/location_service.dart — periodic GPS reporting while a delivery is active

## What's NOT built yet (this is a starter, not a finished app)
- No actual screens/UI — just the service layer. Whoever picks this up needs to build the rider's actual screens (probably very close to the "Rider" tab in frontend/index.html, just native).
- location_service.dart calls POST /riders/:id/location, which doesn't exist on the backend yet — add that endpoint (and somewhere to store the latest point per rider) before this can actually work.
- No login screen — this branch and feature/database-and-auth will need to coordinate, since a native app needs the same JWT login the web frontend is getting.

## To actually build this
```
flutter create . --project-name reflex_rider_app
flutter pub get
flutter analyze
flutter run
```

## Suggested order of work
1. Confirm the service layer compiles (flutter analyze) — do this first
2. Coordinate with whoever's on feature/database-and-auth for the login flow
3. Add the /riders/:id/location backend endpoint (small addition to server.js + store.js)
4. Build the actual rider screen(s), wiring in OfflineQueue and LocationService
5. Test offline behavior for real: put the phone in airplane mode, mark a delivery picked up, confirm it queues; turn airplane mode off, confirm it syncs
