import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'task_api_client.dart';

/// A single action taken while possibly offline (mark picked up, confirm
/// delivered). Queued locally, replayed in order once connectivity returns.
///
/// v2 note: no longer stores riderId — the API client now derives that from
/// its logged-in session (see task_api_client.dart), matching how the
/// backend now verifies identity via JWT rather than a client-supplied ID.
class PendingAction {
  final String type; // 'pickup' | 'confirm'
  final int deliveryId;
  final String? code; // only used for 'confirm'
  final DateTime queuedAt;

  PendingAction({
    required this.type,
    required this.deliveryId,
    this.code,
    required this.queuedAt,
  });

  Map<String, dynamic> toJson() => {
        'type': type,
        'deliveryId': deliveryId,
        'code': code,
        'queuedAt': queuedAt.toIso8601String(),
      };

  factory PendingAction.fromJson(Map<String, dynamic> json) => PendingAction(
        type: json['type'],
        deliveryId: json['deliveryId'],
        code: json['code'],
        queuedAt: DateTime.parse(json['queuedAt']),
      );
}

/// Persists queued actions to disk (survives app restart while offline) and
/// replays them, in the order they were queued, once the device is back online.
class OfflineQueue {
  static const _storageKey = 'reflex_pending_actions';
  final ReflexApiClient api;

  OfflineQueue(this.api);

  Future<List<PendingAction>> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getStringList(_storageKey) ?? [];
    return raw.map((s) => PendingAction.fromJson(jsonDecode(s))).toList();
  }

  Future<void> _save(List<PendingAction> actions) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_storageKey, actions.map((a) => jsonEncode(a.toJson())).toList());
  }

  /// Call this whenever the rider taps "Mark picked up" or "Confirm delivered".
  /// Tries immediately if online; otherwise queues for later.
  Future<bool> enqueueOrSend(PendingAction action) async {
    final connectivity = await Connectivity().checkConnectivity();
    final isOnline = !connectivity.contains(ConnectivityResult.none);

    if (isOnline) {
      final sent = await _trySend(action);
      if (sent) return true;
    }

    final queue = await _load();
    queue.add(action);
    await _save(queue);
    return false; // queued, not sent yet
  }

  Future<bool> _trySend(PendingAction action) async {
    try {
      if (action.type == 'pickup') {
        await api.markPickedUp(action.deliveryId);
      } else if (action.type == 'confirm') {
        await api.confirmDelivered(action.deliveryId, action.code!);
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Call this when connectivity is restored. Replays queued actions in the
  /// order they were queued, stopping at the first failure so order is never
  /// scrambled — whatever failed (and everything queued after it) stays
  /// queued for the next attempt.
  Future<int> flush() async {
    final queue = await _load();
    if (queue.isEmpty) return 0;

    var sentCount = 0;
    var i = 0;
    for (; i < queue.length; i++) {
      final sent = await _trySend(queue[i]);
      if (!sent) break;
      sentCount++;
    }

    await _save(queue.sublist(i));
    return sentCount;
  }

  Future<int> pendingCount() async => (await _load()).length;
}
