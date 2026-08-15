import '../core/config/env_config.dart';
import '../core/network/api_client.dart';
import '../core/realtime/realtime_service.dart';
import '../core/storage/secure_storage_service.dart';
import '../data/repositories/admin_repository.dart';
import '../data/repositories/auth_repository.dart';
import '../data/repositories/catalog_repository.dart';
import '../data/repositories/customer_repository.dart';
import '../data/repositories/messaging_repository.dart';
import '../data/repositories/notification_repository.dart';
import '../data/repositories/order_repository.dart';
import '../data/repositories/review_repository.dart';
import '../data/repositories/rider_repository.dart';
import '../data/repositories/super_admin_repository.dart';
import '../data/repositories/support_repository.dart';
import '../data/repositories/wallet_repository.dart';
import 'app_controller.dart';
import 'delivery_tracker.dart';
import 'rider_location_controller.dart';

/// Manual constructor-based DI. Swap for Riverpod/Bloc later if required; the
/// repositories and models stay the same.
class ServiceLocator {
  ServiceLocator._();

  static final ServiceLocator instance = ServiceLocator._();

  late final SecureStorageService storage;
  late final ApiClient apiClient;
  late final RealtimeService realtime;

  late final AuthRepository authRepository;
  late final CatalogRepository catalogRepository;
  late final OrderRepository orderRepository;
  late final WalletRepository walletRepository;
  late final RiderRepository riderRepository;
  late final CustomerRepository customerRepository;
  late final MessagingRepository messagingRepository;
  late final NotificationRepository notificationRepository;
  late final ReviewRepository reviewRepository;
  late final AdminRepository adminRepository;
  late final SuperAdminRepository superAdminRepository;
  late final SupportRepository supportRepository;

  late final AppController app;

  // Location/maps (Prompt 3) - created per screen because they hold stream
  // subscriptions. Factories are provided; the screens own the lifecycle.
  RiderLocationController createRiderLocationController() =>
      RiderLocationController(repository: riderRepository);

  DeliveryTracker createDeliveryTracker() =>
      DeliveryTracker(repository: orderRepository);

  void init() {
    storage = SecureStorageService();
    apiClient = ApiClient(
      baseUrl: EnvConfig.apiBaseUrl,
      storage: storage,
      // Refresh failures (session truly dead) force the app back to login.
      onSessionExpired: () => app.handleSessionExpired(),
    );
    realtime = RealtimeService(
      storage: storage,
      baseUrl: EnvConfig.realtimeUrl,
    );

    authRepository = AuthRepository(client: apiClient, storage: storage);
    catalogRepository = CatalogRepository(client: apiClient);
    orderRepository = OrderRepository(client: apiClient);
    walletRepository = WalletRepository(client: apiClient);
    riderRepository = RiderRepository(client: apiClient);
    customerRepository = CustomerRepository(client: apiClient);
    messagingRepository = MessagingRepository(client: apiClient);
    notificationRepository = NotificationRepository(client: apiClient);
    reviewRepository = ReviewRepository(client: apiClient);
    adminRepository = AdminRepository(client: apiClient);
    superAdminRepository = SuperAdminRepository(client: apiClient);
    supportRepository = SupportRepository(client: apiClient);

    app = AppController(this);
  }
}
