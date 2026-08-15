import 'package:flutter/material.dart';

import '../../../application/service_locator.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/models/coupon_messaging.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_indicator.dart';

/// Rider Messages: delivery threads.
///
/// Reads the same `GET /api/messages/conversations`, `GET
/// /api/messages/:id` and `POST /api/messages` endpoints the desktop portal
/// uses, so the rider can coordinate with the customer/vendor about the job
/// the same way they do on the desktop.
class RiderMessagesPage extends StatefulWidget {
  const RiderMessagesPage({super.key});

  @override
  State<RiderMessagesPage> createState() => _RiderMessagesPageState();
}

class _RiderMessagesPageState extends State<RiderMessagesPage> {
  List<Conversation>? _conversations;
  String? _error;

  List<MessageItem>? _messages;
  Conversation? _selected;
  bool _sending = false;

  final TextEditingController _input = TextEditingController();
  final ScrollController _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final loc = ServiceLocator.instance;
    final user = loc.app.currentUser;
    if (user == null) return;
    try {
      final convs = await loc.messagingRepository.conversations(userId: user.id);
      if (!mounted) return;
      setState(() => _conversations = convs);
      final first = convs.firstOrNull;
      if (first != null && _selected == null) await _open(first);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    }
  }

  Future<void> _open(Conversation chat) async {
    setState(() {
      _selected = chat;
      _messages = null;
    });
    try {
      final rows =
          await ServiceLocator.instance.messagingRepository.messages(chat.id);
      if (!mounted) return;
      setState(() => _messages = rows);
      _scrollToBottom();
    } catch (e) {
      if (!mounted) return;
      setState(() => _messages = []);
    }
  }

  Future<void> _send() async {
    final chat = _selected;
    final text = _input.text.trim();
    if (chat == null || text.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      await ServiceLocator.instance.messagingRepository
          .sendMessage(conversationId: chat.id, content: text);
      _input.clear();
      await _open(chat);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Send failed: $e')));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.jumpTo(_scroll.position.maxScrollExtent);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = ServiceLocator.instance.app.currentUser;
    return Scaffold(
      appBar: AppBar(
        title: Text(_selected == null ? 'Messages' : _selected!.subject),
      ),
      body: _error != null
          ? ErrorView(message: _error!, onRetry: _load)
          : _conversations == null
              ? const LoadingIndicator(message: 'Loading conversations...')
              : _selected == null
                  ? _conversationsList(user?.id)
                  : _threadView(),
    );
  }

  Widget _conversationsList(String? myId) {
    final convs = _conversations!;
    if (convs.isEmpty) {
      return const EmptyView(
        message:
            'No conversations yet. Your delivery threads will appear here as jobs are coordinated.',
        icon: Icons.chat_bubble_outline,
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: convs.length,
      itemBuilder: (context, i) {
        final chat = convs[i];
        return Card(
          child: ListTile(
            leading: const Icon(Icons.chat_bubble_outline, color: Color(0xFFB45309)),
            title: Text(
              chat.subject.isNotEmpty ? chat.subject : 'Delivery thread',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            subtitle: Text(
              chat.lastMessage.isNotEmpty
                  ? chat.lastMessage
                  : 'Open to view conversation',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodySmall,
            ),
            trailing: chat.unreadCount > 0
                ? Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: const BoxDecoration(
                      color: Color(0xFFB45309),
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      '${chat.unreadCount}',
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.bold),
                    ),
                  )
                : null,
            onTap: () => _open(chat),
          ),
        );
      },
    );
  }

  Widget _threadView() {
    final chat = _selected!;
    final rows = _messages;
    return Column(
      children: [
        Expanded(
          child: rows == null
              ? const LoadingIndicator(message: 'Loading conversation...')
              : rows.isEmpty
                  ? const EmptyView(
                      message: 'No messages yet. Say hello.',
                      icon: Icons.forum_outlined,
                    )
                  : ListView.builder(
                      controller: _scroll,
                      padding: const EdgeInsets.all(12),
                      itemCount: rows.length,
                      itemBuilder: (context, i) => _bubble(rows[i]),
                    ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _input,
                    minLines: 1,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      hintText: 'Message',
                      border: OutlineInputBorder(),
                      contentPadding:
                          EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                    onSubmitted: (_) => _send(),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  tooltip: 'Send',
                  onPressed: _sending ? null : _send,
                  icon: _sending
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.send),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _bubble(MessageItem msg) {
    final myId = ServiceLocator.instance.app.currentUser?.id;
    final mine = msg.senderId == myId;
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        decoration: BoxDecoration(
          color: mine ? const Color(0xFFB45309) : Colors.grey.shade200,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment:
              mine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            Text(
              msg.content,
              style: TextStyle(
                color: mine ? Colors.white : Colors.black87,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              Formatters.date(msg.createdAt),
              style: TextStyle(
                color: mine ? Colors.white70 : Colors.grey.shade600,
                fontSize: 10,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

extension _FirstOrNull<T> on List<T> {
  T? get firstOrNull => isEmpty ? null : this[0];
}