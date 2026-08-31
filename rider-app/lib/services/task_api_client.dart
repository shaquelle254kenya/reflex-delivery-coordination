import 'dart:convert';
import 'package:http/http.dart' as http;

class ReflexApiException implements Exception {
  final int statusCode;
  final String message;
  ReflexApiException(this.statusCode, this.message);
  @override
  String toString() => 'ReflexApiException($statusCode): $message';
}

/// Talks to the Reflex backend. Override baseUrl via
/// --dart-define=API_BASE_URL=... same convention as the main Reflex frontend.
class ReflexApiClient {
  static const String _defaultBaseUrl = 'http://10.0.2.2:5057';
  final String baseUrl;

  ReflexApiClient({String? baseUrl})
      : baseUrl = baseUrl ??
            const String.fromEnvironment('API_BASE_URL', defaultValue: _defaultBaseUrl);

  Future<List<Map<String, dynamic>>> fetchAssignedDeliveries(int riderId) async {
    final res = await http.get(Uri.parse('$baseUrl/deliveries?riderId=$riderId'));
    _throwIfError(res);
    return List<Map<String, dynamic>>.from(jsonDecode(res.body));
  }

  Future<Map<String, dynamic>> markPickedUp(int deliveryId, int riderId) async {
    final res = await http.patch(
      Uri.parse('$baseUrl/deliveries/$deliveryId/pickup'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'riderId': riderId}),
    );
    _throwIfError(res);
    return jsonDecode(res.body);
  }

  Future<Map<String, dynamic>> confirmDelivered(int deliveryId, String code) async {
    final res = await http.post(
      Uri.parse('$baseUrl/deliveries/$deliveryId/confirm'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'code': code}),
    );
    _throwIfError(res);
    return jsonDecode(res.body);
  }

  // TODO(devmanu-m): this endpoint doesn't exist on the backend yet — add
  // POST /riders/:id/location to server.js (and a small locations table or
  // in-memory map to store the latest point per rider) before wiring this up.
  Future<void> reportLocation(int riderId, double lat, double lng) async {
    await http.post(
      Uri.parse('$baseUrl/riders/$riderId/location'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'lat': lat, 'lng': lng}),
    );
  }

  void _throwIfError(http.Response res) {
    if (res.statusCode < 200 || res.statusCode >= 300) {
      String message = res.body;
      try {
        final decoded = jsonDecode(res.body);
        if (decoded is Map && decoded['error'] != null) message = decoded['error'].toString();
      } catch (_) {}
      throw ReflexApiException(res.statusCode, message);
    }
  }
}
