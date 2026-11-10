import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'models.dart';

class ApiService {
  // Over USB debugging with `adb reverse tcp:5000 tcp:5000`, 127.0.0.1 connects to PC host directly in debug mode.
  // When hosted on Web (e.g. GitHub Pages) or production mobile, automatically targets the Render cloud backend.
  static String get defaultHost {
    if (kIsWeb) {
      final host = Uri.base.host.toLowerCase();
      // On GitHub Pages, Render, or any remote web domain, connect directly to the cloud backend
      if (host.contains('github.io') || host.contains('onrender.com') || host.contains('web.app') || (host.isNotEmpty && host != 'localhost' && host != '127.0.0.1')) {
        return 'https://college-verification-system.onrender.com/api';
      }
      return kDebugMode ? 'http://127.0.0.1:5000/api' : 'https://college-verification-system.onrender.com/api';
    }
    return kDebugMode
        ? 'http://127.0.0.1:5000/api'
        : 'https://college-verification-system.onrender.com/api';
  }

  static Future<String> getBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    final custom = prefs.getString('custom_server_url');
    if (custom != null && custom.isNotEmpty) {
      return custom;
    }
    return defaultHost;
  }

  static Future<void> setCustomServerUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('custom_server_url', url.trim());
  }

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }

  static Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
  }

  static Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
  }

  static Future<Map<String, String>> _headers() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static dynamic _safeJsonDecode(http.Response response) {
    if (response.body.trim().isEmpty) return {};
    try {
      return jsonDecode(response.body);
    } catch (_) {
      if (response.statusCode == 404) {
        throw Exception('The requested feature is not available on this server version (404). Please ensure the backend is up to date.');
      } else if (response.statusCode >= 500) {
        throw Exception('Server temporarily unavailable (${response.statusCode}). Please try again in a few moments.');
      }
      throw Exception('Received unexpected response from server (${response.statusCode}).');
    }
  }

  static Future<StudentProfile> login(String identifier, String password) async {
    final baseUrl = await getBaseUrl();
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'identifier': identifier.trim(), 'password': password}),
    );

    final data = _safeJsonDecode(response);
    if (response.statusCode != 200) {
      if (data is Map && data['details'] != null && data['details'] is List && (data['details'] as List).isNotEmpty) {
        final messages = (data['details'] as List)
            .map((d) => d['message'] != null ? '${d['path']?.last ?? ''}: ${d['message']}' : d.toString())
            .join('\n');
        throw Exception(messages);
      }
      throw Exception((data is Map ? data['error'] : null) ?? 'Login failed. Please check your credentials.');
    }

    await saveToken(data['token']);
    final profData = data['user']?['studentProfile'] ?? data['studentProfile'];
    if (profData == null) {
      throw Exception('Student profile not found in account response');
    }
    return StudentProfile.fromJson(profData);
  }

  static Future<StudentProfile> register(Map<String, dynamic> body) async {
    final baseUrl = await getBaseUrl();
    final response = await http.post(
      Uri.parse('$baseUrl/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );

    final data = _safeJsonDecode(response);
    if (response.statusCode != 201) {
      if (data is Map && data['details'] != null && data['details'] is List && (data['details'] as List).isNotEmpty) {
        final messages = (data['details'] as List)
            .map((d) => d['message'] != null ? '${d['path']?.last ?? ''}: ${d['message']}' : d.toString())
            .join('\n');
        throw Exception(messages);
      }
      throw Exception((data is Map ? data['error'] : null) ?? 'Registration failed. Please check all fields.');
    }

    await saveToken(data['token']);
    final profData = data['user']?['studentProfile'] ?? data['studentProfile'];
    if (profData == null) {
      throw Exception('Student profile could not be created');
    }
    return StudentProfile.fromJson(profData);
  }

  static Future<Map<String, dynamic>> forgotPassword(String identifier) async {
    final baseUrl = await getBaseUrl();
    final response = await http.post(
      Uri.parse('$baseUrl/auth/forgot-password'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'identifier': identifier.trim()}),
    );

    final data = _safeJsonDecode(response);
    if (response.statusCode != 200) {
      throw Exception((data is Map ? data['error'] : null) ?? 'Failed to send password reset code');
    }
    return data as Map<String, dynamic>;
  }

  static Future<String> resetPassword({
    required String identifier,
    required String otp,
    required String newPassword,
  }) async {
    final baseUrl = await getBaseUrl();
    final response = await http.post(
      Uri.parse('$baseUrl/auth/reset-password'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'identifier': identifier.trim(),
        'otp': otp.trim(),
        'newPassword': newPassword,
      }),
    );

    final data = _safeJsonDecode(response);
    if (response.statusCode != 200) {
      throw Exception((data is Map ? data['error'] : null) ?? 'Failed to reset password');
    }
    return (data is Map ? data['message'] : null) ?? 'Password reset successfully!';
  }

  static Future<StudentProfile> getProfile() async {
    final baseUrl = await getBaseUrl();
    final headers = await _headers();
    final response = await http.get(
      Uri.parse('$baseUrl/student/profile'),
      headers: headers,
    );

    final data = jsonDecode(response.body);
    if (response.statusCode != 200) {
      throw Exception(data['error'] ?? 'Failed to load profile');
    }

    return StudentProfile.fromJson(data);
  }

  static Future<StudentProfile> updateProfile(Map<String, dynamic> body) async {
    final baseUrl = await getBaseUrl();
    final headers = await _headers();
    final response = await http.put(
      Uri.parse('$baseUrl/student/profile'),
      headers: headers,
      body: jsonEncode(body),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode != 200) {
      throw Exception(data['error'] ?? 'Failed to update profile');
    }

    return StudentProfile.fromJson(data['profile']);
  }

  static Future<StudentDocument> uploadDocument({
    required String type,
    required String fileName,
    required List<int> bytes,
  }) async {
    final baseUrl = await getBaseUrl();
    final token = await getToken();
    final request = http.MultipartRequest('POST', Uri.parse('$baseUrl/student/documents'));
    if (token != null) {
      request.headers['Authorization'] = 'Bearer $token';
    }
    request.fields['type'] = type;
    request.files.add(
      http.MultipartFile.fromBytes('file', bytes, filename: fileName),
    );

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);
    final data = jsonDecode(response.body);

    if (response.statusCode != 201) {
      throw Exception(data['error'] ?? 'Document upload failed');
    }

    return StudentDocument.fromJson(data['document']);
  }

  static Future<void> deleteAccount({String? reason}) async {
    final baseUrl = await getBaseUrl();
    final headers = await _headers();
    final response = await http.delete(
      Uri.parse('$baseUrl/student/account'),
      headers: headers,
      body: jsonEncode({'reason': reason ?? 'Self-requested duplicate account deletion'}),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode != 200) {
      throw Exception(data['error'] ?? 'Failed to delete account');
    }

    await clearToken();
  }

  static String resolveMediaUrl(String? url) {
    if (url == null || url.trim().isEmpty) return '';
    if (url.startsWith('http://localhost:5000')) {
      return url.replaceFirst('http://localhost:5000', 'http://127.0.0.1:5000');
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      final path = url.startsWith('/') ? url : '/$url';
      return 'http://127.0.0.1:5000$path';
    }
    return url;
  }
}
