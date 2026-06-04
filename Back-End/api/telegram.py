import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

def send_telegram_notification(order):
    """
    Супоришро ба гурӯҳи коргарон дар Telegram мефиристад.
    Нишондиҳандаи зебо бо HTML формат.
    """
    token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
    chat_id = getattr(settings, 'TELEGRAM_CHAT_ID', None)
    
    if not token or not chat_id:
        logger.warning("TELEGRAM_BOT_TOKEN ё TELEGRAM_CHAT_ID дар settings.py танзим нашудааст.")
        return False

    items_list = ""
    for item in order.items.all():
        # Барои воҳиди ченкунӣ
        unit = "шт"
        if item.product and item.product.unit:
            unit = item.product.unit
        items_list += f"📦 <b>{item.product_name}</b>\n   ↳ {item.quantity} {unit} × {item.price_at_order} TJS = <b>{item.subtotal} TJS</b>\n"

    address = f"{order.address_village}"
    if order.address_street:
        address += f", к. {order.address_street}"
    if order.address_house:
        address += f", хонаи {order.address_house}"
    if order.address_landmark:
        address += f"\n🎯 <b>Нишона:</b> {order.address_landmark}"

    message = (
        f"🚨 <b>СУПОРИШИ НАВ: {order.number}</b>\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"👤 <b>Муштарӣ:</b> {order.customer_name}\n"
        f"📞 <b>Телефон:</b> <a href='tel:{order.customer_phone}'>{order.customer_phone}</a>\n"
        f"📍 <b>Адрес:</b> {address}\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"🛒 <b>Молҳо:</b>\n{items_list}"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"🚚 <b>Дастраскунӣ:</b> {order.delivery_fee} TJS\n"
        f"💰 <b>Ҷамъи умумӣ:</b> <b>{order.total} TJS</b>\n"
        f"💳 <b>Пардохт:</b> {order.get_payment_method_display()}\n"
    )
    
    if order.notes:
        message += f"📝 <b>Эзоҳ:</b> <i>{order.notes}</i>\n"
        
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "HTML",
        "disable_web_page_preview": True
    }
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        if response.status_code == 200:
            return True
        else:
            logger.error(f"Хатогии Telegram API: {response.text}")
            return False
    except Exception as e:
        logger.error(f"Хатогии пайвастшавӣ ба Telegram: {e}")
        return False
