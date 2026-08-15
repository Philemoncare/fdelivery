import 'package:flutter/material.dart';

import 'app.dart';
import 'application/service_locator.dart';
import 'core/utils/logger.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final locator = ServiceLocator.instance;
  locator.init();

  // Restore the secure-storage session against the real backend.
  await locator.app.bootstrap();
  Logger.info('OmniMarket mobile started. API: ${locator.apiClient.baseUrl}');

  runApp(OmniMarketApp(locator: locator));
}
