import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def send_telegram_notification(order):
    token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
    chat_id = getattr(settings, 'TELEGRAM_CHAT_ID', None)

    if not token or not chat_id:
        logger.warning("TELEGRAM_BOT_TOKEN ё TELEGRAM_CHAT_ID танзим нашудааст.")
        return False

    items_text = ""
    for item in order.items.all():
        unit = item.product.unit if item.product and item.product.unit else "дона"
        items_text += (
            f"  • <b>{item.product_name}</b>\n"
            f"    {item.quantity} {unit} × {item.price_at_order} сом. = <b>{item.subtotal} сом.</b>\n"
        )

    address = order.address_village
    if order.address_street:
        address += f", кӯч. {order.address_street}"
    if order.address_house:
        address += f", хона {order.address_house}"
    if order.address_landmark:
        address += f"\n    🎯 {order.address_landmark}"

    message = (
        f"🛍 <b>Супориши нав #{order.number}</b>\n\n"
        f"👤 <b>{order.customer_name}</b>\n"
        f"📱 <a href='tel:{order.customer_phone}'>{order.customer_phone}</a>\n"
        f"📍 {address}\n\n"
        f"──────────────────\n"
        f"🛒 <b>Маҳсулотҳо:</b>\n{items_text}"
        f"──────────────────\n"
        f"🚚 Расонидан: <b>{order.delivery_fee} сом.</b>\n"
        f"💳 Пардохт: <b>{order.get_payment_method_display()}</b>\n"
        f"💰 Маблағи умумӣ: <b>{order.total} сом.</b>\n"
    )

    if order.notes:
        message += f"\n📝 <i>{order.notes}</i>"

    inline_keyboard = {
        "inline_keyboard": [[
            {"text": "✅ Қабул кардан", "callback_data": f"accept:{order.id}"}
        ]]
    }

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
        "reply_markup": inline_keyboard,
    }

    try:
        r = requests.post(url, json=payload, timeout=10)
        if r.status_code == 200:
            return True
        logger.error(f"Telegram API хато: {r.text}")
        return False
    except Exception as e:
        logger.error(f"Telegram пайвастшавӣ хато: {e}")
        return False


def handle_telegram_callback(data):
    """Process callback_query from Telegram inline keyboard buttons."""
    token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
    if not token:
        return

    callback_query = data.get('callback_query', {})
    callback_id = callback_query.get('id')
    callback_data = callback_query.get('data', '')
    message = callback_query.get('message', {})
    chat_id = message.get('chat', {}).get('id')
    message_id = message.get('message_id')

    # Answer callback to remove Telegram's loading spinner
    try:
        requests.post(
            f"https://api.telegram.org/bot{token}/answerCallbackQuery",
            json={"callback_query_id": callback_id},
            timeout=5,
        )
    except Exception:
        pass

    if not callback_data.startswith('accept:'):
        return

    try:
        order_id = int(callback_data.split(':', 1)[1])
    except (ValueError, IndexError):
        return

    from .models import Order, OrderStatus
    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return

    if order.status == OrderStatus.NEW:
        order.status = OrderStatus.ACCEPTED
        order.save(update_fields=['status'])

        accepted_keyboard = {
            "inline_keyboard": [[
                {"text": "🗑 Нест кардани паём", "callback_data": f"delete_msg:{message_id}:{chat_id}"}
            ]]
        }
        try:
            requests.post(
                f"https://api.telegram.org/bot{token}/editMessageText",
                json={
                    "chat_id": chat_id,
                    "message_id": message_id,
                    "text": (
                        f"✅ <b>Заказ #{order.number} қабул шуд!</b>\n\n"
                        f"👤 {order.customer_name}\n"
                        f"📱 {order.customer_phone}\n"
                        f"💰 {order.total} сом."
                    ),
                    "parse_mode": "HTML",
                    "reply_markup": accepted_keyboard,
                },
                timeout=10,
            )
        except Exception as e:
            logger.error(f"Telegram editMessage хато: {e}")

    elif callback_data.startswith('accept:') and order.status != OrderStatus.NEW:
        # Already accepted — pressing again deletes the message
        try:
            requests.post(
                f"https://api.telegram.org/bot{token}/deleteMessage",
                json={"chat_id": chat_id, "message_id": message_id},
                timeout=10,
            )
        except Exception as e:
            logger.error(f"Telegram deleteMessage хато: {e}")


def handle_delete_message_callback(data):
    """Handle the 'delete message' button pressed after order is accepted."""
    token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
    if not token:
        return

    callback_query = data.get('callback_query', {})
    callback_id = callback_query.get('id')
    callback_data = callback_query.get('data', '')
    message = callback_query.get('message', {})
    chat_id = message.get('chat', {}).get('id')
    message_id = message.get('message_id')

    try:
        requests.post(
            f"https://api.telegram.org/bot{token}/answerCallbackQuery",
            json={"callback_query_id": callback_id},
            timeout=5,
        )
    except Exception:
        pass

    if callback_data.startswith('delete_msg:'):
        try:
            requests.post(
                f"https://api.telegram.org/bot{token}/deleteMessage",
                json={"chat_id": chat_id, "message_id": message_id},
                timeout=10,
            )
        except Exception as e:
            logger.error(f"Telegram deleteMessage хато: {e}")
