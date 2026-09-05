import 'dart:async';
import 'package:geolocator/geolocator.dart';
import 'task_api_client.dart';

/// Periodically reports the rider's GPS position to the backend so the
/// retailer can see roughly where their delivery is.
///
/// v2: the backend endpoint (POST /riders/:id/location) now exists and
/// requires the rider to be logged in — the API client must have already
/// called login() before this class is used.
class LocationService {
  final ReflexApiClient api;
  Timer? _timer;

  LocationService({required this.api});

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
    if (!api.isLoggedIn) {
      throw StateError('Rider must be logged in before starting location tracking.');
    }
    _timer?.cancel();
    _timer = Timer.periodic(interval, (_) => _reportOnce());
    _reportOnce();
  }

  void stopTracking() {
    _timer?.cancel();
    _timer = null;
  }

  Future<void> _reportOnce() async {
    try {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.medium,
      );
      await api.reportLocation(position.latitude, position.longitude);
    } catch (e) {
      // Deliberately swallow errors here — a missed location ping shouldn't
      // crash the app or interrupt the rider's actual delivery workflow.
    }
  }
}
