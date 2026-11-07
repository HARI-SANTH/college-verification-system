import 'package:flutter/material.dart';
import '../api_service.dart';
import 'home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool _isSignUp = false;
  bool _loading = false;
  String? _error;

  // Password visibility states
  bool _obscureLoginPassword = true;
  bool _obscureSignupPassword = true;
  bool _obscureConfirmPassword = true;

  // Form Keys
  final _loginFormKey = GlobalKey<FormState>();
  final _signupFormKey = GlobalKey<FormState>();

  // Login Controllers
  final _loginIdentifierCtrl = TextEditingController();
  final _loginPasswordCtrl = TextEditingController();

  // Sign Up Controllers
  final _firstNameCtrl = TextEditingController();
  final _lastNameCtrl = TextEditingController();
  final _admNoCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  String _bloodGroup = 'O+';
  String _timePeriod = '2024-2028';
  final _signupPasswordCtrl = TextEditingController();
  final _confirmPassCtrl = TextEditingController();

  final List<String> _bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
  final List<String> _timePeriods = ['2024-2028', '2025-2029', '2024-2027', '2025-2028', '2023-2027'];

  @override
  void dispose() {
    _loginIdentifierCtrl.dispose();
    _loginPasswordCtrl.dispose();
    _firstNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _admNoCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _addressCtrl.dispose();
    _signupPasswordCtrl.dispose();
    _confirmPassCtrl.dispose();
    super.dispose();
  }

  void _showServerConfigDialog() async {
    final current = await ApiService.getBaseUrl();
    final ctrl = TextEditingController(text: current);
    if (!mounted) return;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.dns_outlined, color: Color(0xFF00236F), size: 20),
            SizedBox(width: 8),
            Text(
              'Server Connection URL',
              style: TextStyle(color: Color(0xFF0F172A), fontSize: 14, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Default over USB debugging: http://127.0.0.1:5000/api.\nOver Wi-Fi, enter your computer\'s local IP address.',
              style: TextStyle(color: Color(0xFF64748B), fontSize: 11, height: 1.3),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: ctrl,
              style: const TextStyle(color: Color(0xFF0F172A), fontSize: 12),
              decoration: InputDecoration(
                filled: true,
                fillColor: const Color(0xFFF8FAFC),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
          ),
          ElevatedButton(
            onPressed: () async {
              final newUrl = ctrl.text.trim();
              Navigator.pop(ctx);
              await ApiService.setCustomServerUrl(newUrl);
              if (!context.mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Server URL updated!'), backgroundColor: Color(0xFF0D9488)),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF00236F)),
            child: const Text('Save', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Future<void> _handleLogin() async {
    if (!_loginFormKey.currentState!.validate()) return;

    FocusScope.of(context).unfocus();
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final profile = await ApiService.login(
        _loginIdentifierCtrl.text.trim(),
        _loginPasswordCtrl.text,
      );
      if (!mounted) return;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => HomeScreen(initialProfile: profile)),
      );
    } catch (e) {
      setState(() {
        _error = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _handleRegister() async {
    if (!_signupFormKey.currentState!.validate()) return;

    FocusScope.of(context).unfocus();
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final profile = await ApiService.register({
        'firstName': _firstNameCtrl.text.trim(),
        'lastName': _lastNameCtrl.text.trim(),
        'admissionNumber': _admNoCtrl.text.trim().toUpperCase(),
        'email': _emailCtrl.text.trim().toLowerCase(),
        'phoneNumber': _phoneCtrl.text.trim(),
        'address': _addressCtrl.text.trim(),
        'bloodGroup': _bloodGroup,
        'timePeriodOfStudy': _timePeriod,
        'password': _signupPasswordCtrl.text,
      });

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Registration successful! Welcome to the admissions portal.'),
          backgroundColor: Color(0xFF0D9488),
        ),
      );
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => HomeScreen(initialProfile: profile)),
      );
    } catch (e) {
      setState(() {
        _error = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined, color: Color(0xFF64748B), size: 20),
            tooltip: 'Server Connection URL',
            onPressed: _showServerConfigDialog,
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Institutional Seal & Header
                Image.asset(
                  'assets/images/college_logo.png',
                  width: 64,
                  height: 64,
                  fit: BoxFit.contain,
                ),
                const SizedBox(height: 10),
                const Text(
                  'BASELIOS PAULOSE II\nCATHOLICOSE COLLEGE',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Color(0xFF00236F),
                    fontSize: 15,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.8,
                    height: 1.25,
                  ),
                ),
                const SizedBox(height: 3),
                const Text(
                  'Piravom • Student Admissions & Verification Portal',
                  style: TextStyle(color: Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.w500),
                ),
                const SizedBox(height: 20),

                // Main Card Container
                Container(
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      // Mode Switcher (Sign In vs Student Register)
                      Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: GestureDetector(
                                onTap: () {
                                  if (_isSignUp) {
                                    setState(() {
                                      _isSignUp = false;
                                      _error = null;
                                    });
                                  }
                                },
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 9),
                                  decoration: BoxDecoration(
                                    color: !_isSignUp ? Colors.white : Colors.transparent,
                                    borderRadius: BorderRadius.circular(10),
                                    boxShadow: !_isSignUp
                                        ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)]
                                        : null,
                                  ),
                                  child: Center(
                                    child: Text(
                                      'Sign In',
                                      style: TextStyle(
                                        color: !_isSignUp ? const Color(0xFF00236F) : const Color(0xFF64748B),
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            Expanded(
                              child: GestureDetector(
                                onTap: () {
                                  if (!_isSignUp) {
                                    setState(() {
                                      _isSignUp = true;
                                      _error = null;
                                    });
                                  }
                                },
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 9),
                                  decoration: BoxDecoration(
                                    color: _isSignUp ? Colors.white : Colors.transparent,
                                    borderRadius: BorderRadius.circular(10),
                                    boxShadow: _isSignUp
                                        ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)]
                                        : null,
                                  ),
                                  child: Center(
                                    child: Text(
                                      'New Registration',
                                      style: TextStyle(
                                        color: _isSignUp ? const Color(0xFF00236F) : const Color(0xFF64748B),
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Error Banner
                      if (_error != null)
                        Container(
                          padding: const EdgeInsets.all(10),
                          margin: const EdgeInsets.only(bottom: 14),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFDAD6),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFFCA5A5)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.error_outline, color: Color(0xFFBA1A1A), size: 16),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  _error!,
                                  style: const TextStyle(color: Color(0xFFBA1A1A), fontSize: 11, fontWeight: FontWeight.w600),
                                ),
                              ),
                              GestureDetector(
                                onTap: () => setState(() => _error = null),
                                child: const Icon(Icons.close, color: Color(0xFFBA1A1A), size: 16),
                              ),
                            ],
                          ),
                        ),

                      // SIGN IN FORM
                      if (!_isSignUp)
                        Form(
                          key: _loginFormKey,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              TextFormField(
                                controller: _loginIdentifierCtrl,
                                keyboardType: TextInputType.emailAddress,
                                textInputAction: TextInputAction.next,
                                style: const TextStyle(color: Color(0xFF0F172A), fontSize: 13),
                                decoration: InputDecoration(
                                  labelText: 'Email Address or Phone Number',
                                  hintText: 'e.g. name@student.college.edu',
                                  labelStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                                  hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                                  prefixIcon: const Icon(Icons.person_outline, color: Color(0xFF00236F), size: 18),
                                  filled: true,
                                  fillColor: const Color(0xFFF8FAFC),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF00236F), width: 1.5)),
                                ),
                                validator: (val) {
                                  if (val == null || val.trim().isEmpty) {
                                    return 'Please enter your registered email or phone number';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 12),
                              TextFormField(
                                controller: _loginPasswordCtrl,
                                obscureText: _obscureLoginPassword,
                                textInputAction: TextInputAction.done,
                                onFieldSubmitted: (_) => _handleLogin(),
                                style: const TextStyle(color: Color(0xFF0F172A), fontSize: 13),
                                decoration: InputDecoration(
                                  labelText: 'Password',
                                  hintText: 'Enter your password',
                                  labelStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                                  hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                                  prefixIcon: const Icon(Icons.lock_outline, color: Color(0xFF00236F), size: 18),
                                  suffixIcon: IconButton(
                                    icon: Icon(
                                      _obscureLoginPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                      color: const Color(0xFF64748B),
                                      size: 18,
                                    ),
                                    onPressed: () => setState(() => _obscureLoginPassword = !_obscureLoginPassword),
                                  ),
                                  filled: true,
                                  fillColor: const Color(0xFFF8FAFC),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF00236F), width: 1.5)),
                                ),
                                validator: (val) {
                                  if (val == null || val.isEmpty) {
                                    return 'Please enter your password';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 20),
                              SizedBox(
                                width: double.infinity,
                                height: 48,
                                child: ElevatedButton(
                                  onPressed: _loading ? null : _handleLogin,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF00236F),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                    elevation: 1,
                                  ),
                                  child: _loading
                                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                      : const Text(
                                          'Sign In to Student Portal',
                                          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 13),
                                        ),
                                ),
                              ),
                              const SizedBox(height: 14),
                              Center(
                                child: TextButton(
                                  onPressed: () => setState(() => _isSignUp = true),
                                  child: const Text(
                                    'First time applicant? Register here',
                                    style: TextStyle(color: Color(0xFF00236F), fontSize: 11, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                      // SIGN UP FORM
                      if (_isSignUp)
                        Form(
                          key: _signupFormKey,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: TextFormField(
                                      controller: _firstNameCtrl,
                                      textInputAction: TextInputAction.next,
                                      style: const TextStyle(color: Color(0xFF0F172A), fontSize: 12),
                                      decoration: InputDecoration(
                                        labelText: 'First Name',
                                        hintText: 'e.g. Harisanth',
                                        labelStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                                        filled: true,
                                        fillColor: const Color(0xFFF8FAFC),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF00236F), width: 1.5)),
                                      ),
                                      validator: (val) => val == null || val.trim().isEmpty ? 'Required' : null,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: TextFormField(
                                      controller: _lastNameCtrl,
                                      textInputAction: TextInputAction.next,
                                      style: const TextStyle(color: Color(0xFF0F172A), fontSize: 12),
                                      decoration: InputDecoration(
                                        labelText: 'Last Name',
                                        hintText: 'e.g. S',
                                        labelStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                                        filled: true,
                                        fillColor: const Color(0xFFF8FAFC),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF00236F), width: 1.5)),
                                      ),
                                      validator: (val) => val == null || val.trim().isEmpty ? 'Required' : null,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              TextFormField(
                                controller: _admNoCtrl,
                                textCapitalization: TextCapitalization.characters,
                                textInputAction: TextInputAction.next,
                                style: const TextStyle(color: Color(0xFF0F172A), fontSize: 12, fontWeight: FontWeight.bold),
                                decoration: InputDecoration(
                                  labelText: 'Admission / Roll Number',
                                  hintText: 'e.g. 24BCA033',
                                  labelStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                                  prefixIcon: const Icon(Icons.badge_outlined, color: Color(0xFF00236F), size: 16),
                                  filled: true,
                                  fillColor: const Color(0xFFF8FAFC),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF00236F), width: 1.5)),
                                ),
                                validator: (val) => val == null || val.trim().isEmpty ? 'Please enter admission / roll number' : null,
                              ),
                              const SizedBox(height: 8),
                              TextFormField(
                                controller: _emailCtrl,
                                keyboardType: TextInputType.emailAddress,
                                textInputAction: TextInputAction.next,
                                style: const TextStyle(color: Color(0xFF0F172A), fontSize: 12),
                                decoration: InputDecoration(
                                  labelText: 'Email Address',
                                  hintText: 'e.g. student@college.edu',
                                  labelStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                                  prefixIcon: const Icon(Icons.email_outlined, color: Color(0xFF00236F), size: 16),
                                  filled: true,
                                  fillColor: const Color(0xFFF8FAFC),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF00236F), width: 1.5)),
                                ),
                                validator: (val) {
                                  if (val == null || val.trim().isEmpty) return 'Please enter your email';
                                  if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(val.trim())) {
                                    return 'Enter a valid email address';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 8),
                              TextFormField(
                                controller: _phoneCtrl,
                                keyboardType: TextInputType.phone,
                                textInputAction: TextInputAction.next,
                                style: const TextStyle(color: Color(0xFF0F172A), fontSize: 12),
                                decoration: InputDecoration(
                                  labelText: 'Mobile Phone Number',
                                  hintText: 'e.g. 9876543210',
                                  labelStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                                  prefixIcon: const Icon(Icons.phone_outlined, color: Color(0xFF00236F), size: 16),
                                  filled: true,
                                  fillColor: const Color(0xFFF8FAFC),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF00236F), width: 1.5)),
                                ),
                                validator: (val) {
                                  if (val == null || val.trim().isEmpty) return 'Please enter mobile number';
                                  if (val.trim().length < 10) return 'Must be at least 10 digits';
                                  return null;
                                },
                              ),
                              const SizedBox(height: 8),
                              TextFormField(
                                controller: _addressCtrl,
                                maxLines: 2,
                                textInputAction: TextInputAction.next,
                                style: const TextStyle(color: Color(0xFF0F172A), fontSize: 12),
                                decoration: InputDecoration(
                                  labelText: 'Permanent Residential Address with PIN',
                                  hintText: 'House Name, Street, City, PIN Code',
                                  labelStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                                  prefixIcon: const Icon(Icons.home_outlined, color: Color(0xFF00236F), size: 16),
                                  filled: true,
                                  fillColor: const Color(0xFFF8FAFC),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF00236F), width: 1.5)),
                                ),
                                validator: (val) => val == null || val.trim().isEmpty ? 'Please enter address' : null,
                              ),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Expanded(
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFF8FAFC),
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(color: const Color(0xFFE2E8F0)),
                                      ),
                                      child: DropdownButtonHideUnderline(
                                        child: DropdownButton<String>(
                                          value: _bloodGroup,
                                          isExpanded: true,
                                          style: const TextStyle(color: Color(0xFF0F172A), fontSize: 12, fontWeight: FontWeight.bold),
                                          items: _bloodGroups
                                              .map((b) => DropdownMenuItem(value: b, child: Text('Blood: $b')))
                                              .toList(),
                                          onChanged: (val) => setState(() => _bloodGroup = val!),
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFF8FAFC),
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(color: const Color(0xFFE2E8F0)),
                                      ),
                                      child: DropdownButtonHideUnderline(
                                        child: DropdownButton<String>(
                                          value: _timePeriod,
                                          isExpanded: true,
                                          style: const TextStyle(color: Color(0xFF0F172A), fontSize: 12, fontWeight: FontWeight.bold),
                                          items: _timePeriods
                                              .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                                              .toList(),
                                          onChanged: (val) => setState(() => _timePeriod = val!),
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              TextFormField(
                                controller: _signupPasswordCtrl,
                                obscureText: _obscureSignupPassword,
                                textInputAction: TextInputAction.next,
                                style: const TextStyle(color: Color(0xFF0F172A), fontSize: 12),
                                decoration: InputDecoration(
                                  labelText: 'Create Password (min. 6 characters)',
                                  labelStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                                  prefixIcon: const Icon(Icons.lock_outline, color: Color(0xFF00236F), size: 16),
                                  suffixIcon: IconButton(
                                    icon: Icon(
                                      _obscureSignupPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                      color: const Color(0xFF64748B),
                                      size: 16,
                                    ),
                                    onPressed: () => setState(() => _obscureSignupPassword = !_obscureSignupPassword),
                                  ),
                                  filled: true,
                                  fillColor: const Color(0xFFF8FAFC),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF00236F), width: 1.5)),
                                ),
                                validator: (val) {
                                  if (val == null || val.isEmpty) return 'Please create a password';
                                  if (val.length < 6) return 'Password must be at least 6 characters';
                                  return null;
                                },
                              ),
                              const SizedBox(height: 8),
                              TextFormField(
                                controller: _confirmPassCtrl,
                                obscureText: _obscureConfirmPassword,
                                textInputAction: TextInputAction.done,
                                onFieldSubmitted: (_) => _handleRegister(),
                                style: const TextStyle(color: Color(0xFF0F172A), fontSize: 12),
                                decoration: InputDecoration(
                                  labelText: 'Confirm Password',
                                  labelStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                                  prefixIcon: const Icon(Icons.check_circle_outline, color: Color(0xFF00236F), size: 16),
                                  suffixIcon: IconButton(
                                    icon: Icon(
                                      _obscureConfirmPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                      color: const Color(0xFF64748B),
                                      size: 16,
                                    ),
                                    onPressed: () => setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
                                  ),
                                  filled: true,
                                  fillColor: const Color(0xFFF8FAFC),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF00236F), width: 1.5)),
                                ),
                                validator: (val) {
                                  if (val == null || val.isEmpty) return 'Please confirm your password';
                                  if (val != _signupPasswordCtrl.text) return 'Passwords do not match';
                                  return null;
                                },
                              ),
                              const SizedBox(height: 18),
                              SizedBox(
                                width: double.infinity,
                                height: 48,
                                child: ElevatedButton(
                                  onPressed: _loading ? null : _handleRegister,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF00236F),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                    elevation: 1,
                                  ),
                                  child: _loading
                                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                      : const Text(
                                          'Complete Student Registration',
                                          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 13),
                                        ),
                                ),
                              ),
                              const SizedBox(height: 12),
                              Center(
                                child: TextButton(
                                  onPressed: () => setState(() => _isSignUp = false),
                                  child: const Text(
                                    'Already have an account? Sign In',
                                    style: TextStyle(color: Color(0xFF00236F), fontSize: 11, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
