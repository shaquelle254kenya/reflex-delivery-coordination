import 'dart:async';
import 'package:geolocator/geolocator.dart';
import 'task_api_client.dart';

/// Periodically reports the rider's GPS position to the backend so the
/// retailer can see roughly where their delivery is.
///
/// NOTE for whoever picks this up: the backend endpoint this calls
/// (POST /riders/:id/location) doesn't exist yet — see the TODO in
/// task_api_client.dart. This class is written against the endpoint we
/// WANT to exist; add it to server.js before wiring this into the UI.
class LocationService {
  final ReflexApiClient api;
  final int riderId;
  Timer? _timer;

  LocationService({required this.api, required this.riderId});

  /// Call once, e.g. when the rider marks a delivery "picked up" — no point
  /// tracking location before there's an active delivery to track against.
  Future<bool> requestPermission() async {
    final enabled = await Geolocator.isLocationServiceEnabled();
    if (!enabled) return false;

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    return permission == LocationPermission.always || permission == LocationPermission.whileInUse;
  }

  /// Starts sending the rider's position every [interval] — default every
  /// 30 seconds, a reasonable balance between "useful tracking" and
  /// "doesn't drain the rider's battery/data on a shared boda boda phone".
  void startTracking({Duration interval = const Duration(seconds: 30)}) {
    _timer?.cancel();
    _timer = Timer.periodic(interval, (_) => _reportOnce());
    _reportOnce(); // send one immediately, don't wait for the first tick
  }

  void stopTracking() {
    _timer?.cancel();
    _timer = null;
  }

  Future<void> _reportOnce() async {
    try {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.medium, // battery-friendlier than .best
      );
      await api.reportLocation(riderId, position.latitude, position.longitude);
    } catch (e) {
      // Deliberately swallow errors here — a missed location ping shouldn't
      // crash the app or interrupt the rider's actual delivery workflow.
      // A production version should log this to crash reporting instead.
    }
  }
}
