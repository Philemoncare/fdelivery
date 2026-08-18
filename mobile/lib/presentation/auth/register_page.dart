import 'package:flutter/material.dart';

import '../../application/service_locator.dart';
import '../../core/network/api_exception.dart';
import '../../core/utils/validators.dart';
import '../shared/widgets/loading_indicator.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final _formKey = GlobalKey<FormState>();
  String _role = 'customer';
  bool _obscure = true;

  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  final _businessName = TextEditingController();
  final _category = TextEditingController();
  final _businessAddress = TextEditingController();
  final _vehicleType = TextEditingController();
  final _vehicleNumber = TextEditingController();
  final _driverLicense = TextEditingController();
  final _nationalId = TextEditingController();

  @override
  void dispose() {
    for (final c in [
      _name, _email, _phone, _password, _confirm,
      _businessName, _category, _businessAddress,
      _vehicleType, _vehicleNumber, _driverLicense, _nationalId,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final app = ServiceLocator.instance.app;
    final name = _name.text.trim();
    final nameParts = name.split(RegExp(r'\s+'));
    final firstName = nameParts.isNotEmpty ? nameParts.first : '';
    final lastName = nameParts.length > 1 ? nameParts.sublist(1).join(' ') : '';

    final payload = <String, dynamic>{
      'role': _role,
      'email': _email.text.trim(),
      'phone': _phone.text.trim(),
      'password': _password.text,
      'name': name,
      'displayName': name,
      'firstName': firstName,
      'lastName': lastName,
    };

    if (_role == 'vendor') {
      payload.addAll({
        'businessName': _businessName.text.trim(),
        'category': _category.text.trim(),
        'businessAddress': _businessAddress.text.trim(),
      });
    } else if (_role == 'rider') {
      payload.addAll({
        'vehicleType': _vehicleType.text.trim(),
        'vehicleNumber': _vehicleNumber.text.trim(),
        'driverLicense': _driverLicense.text.trim(),
        'nationalId': _nationalId.text.trim(),
      });
    }

    try {
      await app.register(payload);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_role == 'customer'
              ? 'Account created. Sign in to continue.'
              : 'Registration submitted for review. Sign in to check status.'),
        ),
      );
      Navigator.of(context).pop();
    } on Exception catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e is ApiException ? e.message : e.toString())),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = ServiceLocator.instance.app;
    return Scaffold(
      appBar: AppBar(title: const Text('Create account')),
      body: SafeArea(
        child: ListenableBuilder(
          listenable: app,
          builder: (context, _) {
            if (app.isLoading) return const LoadingIndicator(message: 'Creating account…');
            return SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    SegmentedButton<String>(
                      segments: const [
                        ButtonSegment(value: 'customer', label: Text('Customer'), icon: Icon(Icons.person)),
                        ButtonSegment(value: 'vendor', label: Text('Restaurant'), icon: Icon(Icons.storefront)),
                        ButtonSegment(value: 'rider', label: Text('Rider'), icon: Icon(Icons.delivery_dining)),
                      ],
                      selected: {_role},
                      onSelectionChanged: (s) => setState(() => _role = s.first),
                    ),
                    const SizedBox(height: 20),
                    TextFormField(
                      controller: _name,
                      decoration: const InputDecoration(labelText: 'Full name', prefixIcon: Icon(Icons.badge_outlined)),
                      validator: (v) => Validators.required(v, 'Full name'),
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.mail_outline)),
                      validator: Validators.email,
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _phone,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(labelText: 'Phone', prefixIcon: Icon(Icons.phone_outlined)),
                      validator: Validators.phone,
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _password,
                      obscureText: _obscure,
                      decoration: InputDecoration(
                        labelText: 'Password',
                        prefixIcon: const Icon(Icons.lock_outline),
                        suffixIcon: IconButton(
                          icon: Icon(_obscure ? Icons.visibility_off : Icons.visibility),
                          onPressed: () => setState(() => _obscure = !_obscure),
                        ),
                      ),
                      validator: Validators.password,
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _confirm,
                      obscureText: _obscure,
                      decoration: const InputDecoration(labelText: 'Confirm password', prefixIcon: Icon(Icons.lock_outline)),
                      validator: (v) => Validators.confirmPassword(v, _password.text),
                    ),
                    if (_role == 'vendor') ...[
                      const SizedBox(height: 20),
                      TextFormField(
                        controller: _businessName,
                        decoration: const InputDecoration(labelText: 'Restaurant name', prefixIcon: Icon(Icons.storefront_outlined)),
                        validator: (v) => Validators.required(v, 'Restaurant name'),
                      ),
                      const SizedBox(height: 14),
                      TextFormField(
                        controller: _category,
                        decoration: const InputDecoration(labelText: 'Category (e.g. Local Dishes)', prefixIcon: Icon(Icons.category_outlined)),
                      ),
                      const SizedBox(height: 14),
                      TextFormField(
                        controller: _businessAddress,
                        decoration: const InputDecoration(labelText: 'Restaurant address', prefixIcon: Icon(Icons.location_on_outlined)),
                      ),
                    ],
                    if (_role == 'rider') ...[
                      const SizedBox(height: 20),
                      TextFormField(
                        controller: _vehicleType,
                        decoration: const InputDecoration(labelText: 'Vehicle type (e.g. Motorcycle)', prefixIcon: Icon(Icons.two_wheeler_outlined)),
                      ),
                      const SizedBox(height: 14),
                      TextFormField(
                        controller: _vehicleNumber,
                        decoration: const InputDecoration(labelText: 'Vehicle number', prefixIcon: Icon(Icons.directions_car_outlined)),
                      ),
                      const SizedBox(height: 14),
                      TextFormField(
                        controller: _driverLicense,
                        decoration: const InputDecoration(labelText: 'Driver licence number', prefixIcon: Icon(Icons.badge_outlined)),
                      ),
                      const SizedBox(height: 14),
                      TextFormField(
                        controller: _nationalId,
                        decoration: const InputDecoration(labelText: 'National ID number', prefixIcon: Icon(Icons.credit_card_outlined)),
                      ),
                    ],
                    const SizedBox(height: 24),
                    FilledButton(onPressed: _submit, child: const Text('Create Account')),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
