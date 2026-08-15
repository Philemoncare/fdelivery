import 'package:flutter/material.dart';

import '../../application/service_locator.dart';
import '../../core/network/api_exception.dart';
import '../../core/utils/validators.dart';
import '../shared/widgets/loading_indicator.dart';

class ForgotPasswordPage extends StatefulWidget {
  const ForgotPasswordPage({super.key});

  @override
  State<ForgotPasswordPage> createState() => _ForgotPasswordPageState();
}

class _ForgotPasswordPageState extends State<ForgotPasswordPage> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  bool _sent = false;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final app = ServiceLocator.instance.app;
    try {
      await ServiceLocator.instance.authRepository
          .requestPasswordReset(_email.text.trim());
      if (!mounted) return;
      setState(() => _sent = true);
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
      appBar: AppBar(title: const Text('Reset password')),
      body: SafeArea(
        child: ListenableBuilder(
          listenable: app,
          builder: (context, _) {
            if (app.isLoading) return const LoadingIndicator(message: 'Sending reset link…');
            return SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Enter your account email. We will send a reset code you can use to set a new password.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 20),
                    TextFormField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.mail_outline)),
                      validator: Validators.email,
                    ),
                    const SizedBox(height: 20),
                    FilledButton(
                      onPressed: _sent ? null : _submit,
                      child: Text(_sent ? 'Reset code sent' : 'Send reset code'),
                    ),
                    if (_sent) ...[
                      const SizedBox(height: 12),
                      TextButton(
                        onPressed: () => Navigator.of(context)
                            .pushReplacementNamed('/reset-password'),
                        child: const Text('I have the code - set a new password'),
                      ),
                    ],
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
