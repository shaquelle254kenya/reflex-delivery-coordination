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
///
/// v2 update: the backend now requires a JWT for pickup, confirm, and
/// location endpoints (see docs/trade-offs.md #2 — rider identity now comes
/// from a verified token, not a client-supplied riderId). Call [login] first
/// and this class holds the token for subsequent authenticated calls.
class ReflexApiClient {
  static const String _defaultBaseUrl = 'http://10.0.2.2:5057';
  final String baseUrl;
  String? _token;
  int? _riderId;

  ReflexApiClient({String? baseUrl})
      : baseUrl = baseUrl ??
            const String.fromEnvironment('API_BASE_URL', defaultValue: _defaultBaseUrl);

  int? get riderId => _riderId;
  bool get isLoggedIn => _token != null;

  Future<void> login(String name, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'name': name, 'password': password}),
    );
    _throwIfError(res);
    final data = jsonDecode(res.body);
    _token = data['token'];
    _riderId = data['rider']['id'];
  }

  void logout() {
    _token = null;
    _riderId = null;
  }

  Map<String, String> get _authHeaders {
    if (_token == null) {
      throw StateError('Not logged in — call login() before making authenticated requests.');
    }
    return {'Content-Type': 'application/json', 'Authorization': 'Bearer $_token'};
  }

  Future<List<Map<String, dynamic>>> fetchAssignedDeliveries() async {
    final res = await http.get(Uri.parse('$baseUrl/deliveries?riderId=$_riderId'));
    _throwIfError(res);
    return List<Map<String, dynamic>>.from(jsonDecode(res.body));
  }

  Future<Map<String, dynamic>> markPickedUp(int deliveryId) async {
    final res = await http.patch(
      Uri.parse('$baseUrl/deliveries/$deliveryId/pickup'),
      headers: _authHeaders,
      body: jsonEncode({}),
    );
    _throwIfError(res);
    return jsonDecode(res.body);
  }

  Future<Map<String, dynamic>> confirmDelivered(int deliveryId, String code) async {
    final res = await http.post(
      Uri.parse('$baseUrl/deliveries/$deliveryId/confirm'),
      headers: _authHeaders,
      body: jsonEncode({'code': code}),
    );
    _throwIfError(res);
    return jsonDecode(res.body);
  }

  /// Now a real, working endpoint (added in v2) — the TODO from v1 is resolved.
  Future<void> reportLocation(double lat, double lng) async {
    final res = await http.post(
      Uri.parse('$baseUrl/riders/$_riderId/location'),
      headers: _authHeaders,
      body: jsonEncode({'lat': lat, 'lng': lng}),
    );
    _throwIfError(res);
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
