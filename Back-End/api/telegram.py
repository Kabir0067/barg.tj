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

    # Рӯйхати маҳсулотҳо
    items_text = ""
    for item in order.items.all():
        unit = item.product.unit if item.product and item.product.unit else "дона"
        items_text += (
            f"  • <b>{item.product_name}</b>\n"
            f"    {item.quantity} {unit} × {item.price_at_order} сом. = <b>{item.subtotal} сом.</b>\n"
        )

    # Манзил
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

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
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
