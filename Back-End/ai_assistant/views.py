from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum, Count, F, DecimalField
from django.db.models.functions import Coalesce
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework import status

from api.models import (
    Category, Product, Order, OrderItem, OrderStatus, PaymentMethod
)
from .llm_client import ask_ai


@api_view(['POST'])
@permission_classes([AllowAny])
def client_chat(request):
    """
    POST /api/ai/chat/
    Чат бо муштарӣ дар бораи маҳсулот ва дастраскунӣ (бо тоҷикӣ ё русӣ)
    """
    message = request.data.get('message')
    history = request.data.get('history', [])  # Рӯйхати муколамаҳои кӯҳна
    lang = request.data.get('lang', 'tj')      # Забони интихобшуда
    
    if not message:
        return Response(
            {"error": "Майдони 'message' ҳатмист"}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    # 1. Ҷамъоварии маълумоти анбор
    categories = Category.objects.filter(is_active=True)
    products = Product.objects.filter(is_active=True).select_related('category')
    
    catalog_context = "Маълумоти воқеии анбори Barg.tj:\n"
    for cat in categories:
        cat_products = products.filter(category=cat)
        if cat_products.exists():
            catalog_context += f"\n📁 Категория: {cat.name_tj} / {cat.name_ru}\n"
            for prod in cat_products:
                catalog_context += (
                    f"  - {prod.name_tj} ({prod.name_ru}) | Нарх: {prod.price} сомонӣ | "
                    f"Воҳид: {prod.unit} | SKU: {prod.sku} | Мавҷудияти анбор: {prod.stock} {prod.unit}\n"
                )

    # 2. Танзими System Prompt мувофиқи забони интихобшуда
    if lang == 'ru':
        system_prompt = (
            "Ты — заботливый, вежливый и опытный продавец-консультант строительного гипермаркета 'Barg.tj'.\n"
            "Твоя задача — помогать покупателям выбирать строительные товары, отвечать на вопросы о наличии, ценах и доставке.\n\n"
            "ПРАВИЛА ОБЩЕНИЯ:\n"
            "1. Отвечай СТРОГО на русском языке. Пиши теплым, живым человеческим языком, избегай роботизированных ответов и сложных технических терминов.\n"
            "2. Пользуйся только предоставленными реальными данными о товарах. Если товара нет в списке, скажи вежливо: 'К сожалению, этого товара сейчас нет на складе'.\n"
            "3. Правила доставки: при заказе от 5000 сомони доставка бесплатная. До 5000 сомони доставка стоит 20 сомони.\n"
            "4. Если клиент определился с заказом, подскажи, что он может добавить товары в корзину и оформить заказ.\n\n"
            f"{catalog_context}"
        )
    else:
        system_prompt = (
            "Шумо маслиҳатчӣ ва фурӯшандаи ғамхор, боодобу ботаҷрибаи мағозаи сохтмонии 'Barg.tj' ҳастед.\n"
            "Вазифаи шумо ёрӣ расонидан ба мизоҷон барои интихоби маводҳои сохтмонӣ, ҷавоб додан ба саволҳо дар бораи нарх ва дастраскунӣ мебошад.\n\n"
            "ҚОИДАҲОИ МУОШИРАТ:\n"
            "1. ҚАТЪИЯН бо забони тоҷикии содда, ҳалим ва инсонӣ ҷавоб диҳед. Аз ҷумлаҳои хушки роботӣ ва истилоҳоти мураккаби техникӣ худдорӣ кунед. Мисли як шахси оддии меҳрубон муошират кунед.\n"
            "2. Танҳо аз рӯйхати воқеии маҳсулот истифода баред. Агар маҳсулот дар анбор набошад, боодобона гӯед: 'Мутаассифона, ин маҳсулот ҳоло дар анбор нест'.\n"
            "3. Қоидаи дастраскунӣ: барои фармоиши зиёда аз 5000 сомонӣ дастраскунӣ комилан ройгон аст. То 5000 сомонӣ нархи дастраскунӣ 20 сомонӣ аст.\n"
            "4. Агар мизоҷ барои харид омода бошад, роҳнамоӣ кунед, ки маҳсулотро ба сабад илова карда, фармоиш диҳад.\n\n"
            f"{catalog_context}"
        )

    # 3. Ташаккули таърихи суҳбат
    history_str = ""
    for msg in history:
        role = "Мизоҷ" if msg.get('role') == 'user' else "Ёвар"
        history_str += f"{role}: {msg.get('content')}\n"
    
    combined_user_message = f"{history_str}Мизоҷ: {message}\nЁвар:"

    # 4. Муроҷиат ба ИИ
    ai_response = ask_ai(system_prompt, combined_user_message)
    
    return Response({
        "response": ai_response
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_query(request):
    """
    POST /api/ai/admin-query/
    Аналитика ва аудити тиҷорат бо ёрии ИИ барои роҳбар (Админ)
    """
    message = request.data.get('message')
    if not message:
        return Response(
            {"error": "Майдони 'message' ҳатмист"}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    # 1. Ҷамъоварии маълумоти молиявии мағоза барои ИИ
    today = timezone.now().date()
    yesterday = today - timedelta(days=1)
    month_ago = today - timedelta(days=30)
    completed = Order.objects.filter(status=OrderStatus.COMPLETED)

    # Имрӯз
    today_revenue = completed.filter(completed_at__date=today).aggregate(s=Coalesce(Sum('total'), Decimal('0')))['s']
    today_profit = OrderItem.objects.filter(
        order__status=OrderStatus.COMPLETED,
        order__completed_at__date=today
    ).aggregate(
        p=Coalesce(Sum((F('price_at_order') - F('cost_price_at_order')) * F('quantity')), Decimal('0'))
    )['p']
    today_orders_count = Order.objects.filter(created_at__date=today).count()

    # Дирӯз
    yesterday_revenue = completed.filter(completed_at__date=yesterday).aggregate(s=Coalesce(Sum('total'), Decimal('0')))['s']
    yesterday_profit = OrderItem.objects.filter(
        order__status=OrderStatus.COMPLETED,
        order__completed_at__date=yesterday
    ).aggregate(
        p=Coalesce(Sum((F('price_at_order') - F('cost_price_at_order')) * F('quantity')), Decimal('0'))
    )['p']

    # Моҳ
    month_revenue = completed.filter(completed_at__date__gte=month_ago).aggregate(s=Coalesce(Sum('total'), Decimal('0')))['s']
    month_profit = OrderItem.objects.filter(
        order__status=OrderStatus.COMPLETED,
        order__completed_at__date__gte=month_ago
    ).aggregate(
        p=Coalesce(Sum((F('price_at_order') - F('cost_price_at_order')) * F('quantity')), Decimal('0'))
    )['p']

    # Маҳсулоти анбор бо нархгузорӣ (Себестоимость ва фурӯш)
    inventory_val = Product.objects.filter(is_active=True).aggregate(
        wholesale=Coalesce(Sum(F('cost_price') * F('stock'), output_field=DecimalField(max_digits=14, decimal_places=2)), Decimal('0')),
        retail=Coalesce(Sum(F('price') * F('stock'), output_field=DecimalField(max_digits=14, decimal_places=2)), Decimal('0'))
    )
    total_wholesale = inventory_val['wholesale']
    total_retail = inventory_val['retail']
    potential_profit = total_retail - total_wholesale

    # Маблағи зарурӣ барои пурра кардани захираи анбор
    restock_budget = Product.objects.filter(
        is_active=True,
        stock__lt=F('low_stock_threshold')
    ).annotate(
        needed=F('low_stock_threshold') - F('stock')
    ).aggregate(
        total=Coalesce(Sum(F('needed') * F('cost_price'), output_field=DecimalField(max_digits=14, decimal_places=2)), Decimal('0'))
    )['total']

    # Рентабелнокии тиҷорат (Моҳона)
    month_margin = Decimal('0')
    if month_revenue > 0:
        month_margin = round((month_profit / month_revenue) * 100, 1)

    # Фоизи иҷрои заказҳо (Conversion Rate)
    total_orders_all = Order.objects.count()
    completed_orders_all = completed.count()
    conversion_rate = Decimal('0')
    if total_orders_all > 0:
        conversion_rate = round((completed_orders_all / total_orders_all) * 100, 1)

    # Анбори муҳим
    low_stock = Product.objects.filter(is_active=True, stock__lte=F('low_stock_threshold'))
    low_stock_text = ""
    for p in low_stock:
        low_stock_text += f"- {p.name_tj} | SKU: {p.sku} | Боқимонда: {p.stock} {p.unit} (Ҳадди ақалл: {p.low_stock_threshold})\n"
    if not low_stock_text:
        low_stock_text = "Ҳамаи молҳо захираи кофӣ доранд."

    # Курьерҳо
    couriers_data = Order.objects.filter(
        status=OrderStatus.COMPLETED, 
        assigned_worker__isnull=False
    ).values(
        'assigned_worker__name', 'assigned_worker__phone'
    ).annotate(
        total_orders=Count('id'),
        total_collected=Sum('total')
    )
    courier_text = ""
    for c in couriers_data:
        courier_text += f"- {c['assigned_worker__name']} (тел: {c['assigned_worker__phone']}): {c['total_orders']} заказ расонд, маблағ: {c['total_collected']} TJS\n"
    if not courier_text:
        courier_text = "Курьерҳо имрӯз фармоиш иҷро накардаанд."

    # Сохтани гузориши молиявӣ
    financial_context = (
        f"ХИСОБОТИ МОЛИЯВИИ БИЗНЕС (Имрӯз: {today}):\n\n"
        f"1. Нишондиҳандаҳои имрӯз:\n"
        f"   - Фармоишҳои нав: {today_orders_count} адад\n"
        f"   - Даромад (Выручка): {today_revenue} TJS\n"
        f"   - Фоидаи соф (Net Profit): {today_profit} TJS\n\n"
        f"2. Нишондиҳандаҳои дирӯз:\n"
        f"   - Даромад: {yesterday_revenue} TJS\n"
        f"   - Фоидаи соф: {yesterday_profit} TJS\n\n"
        f"3. 30 рӯзи охир:\n"
        f"   - Даромад: {month_revenue} TJS\n"
        f"   - Фоидаи соф: {month_profit} TJS\n"
        f"   - Рентабелнокии тиҷорат (Маржинальность): {month_margin}%\n"
        f"   - Фоизи иҷрои заказҳо (Conversion Rate): {conversion_rate}%\n\n"
        f"4. Таҳлили анбор ва сармоя (Склад ва Сармоя):\n"
        f"   - Арзиши умумии анбор бо нархи харид (себестоимость): {total_wholesale} TJS\n"
        f"   - Арзиши умумии анбор бо нархи фурӯш: {total_retail} TJS\n"
        f"   - Фоидаи софи эҳтимолӣ аз фурӯши боқимондаҳо: {potential_profit} TJS\n"
        f"   - Буҷети зарурӣ барои пурра кардани молҳои каммонда (Restock Budget): {restock_budget} TJS\n\n"
        f"5. Ҳолати курьерҳо:\n{courier_text}\n"
        f"6. Молҳои каммонда дар анбор:\n{low_stock_text}\n"
    )

    # 2. Систем промпт барои ИИ
    system_prompt = (
        "Ты — высококлассный финансовый аналитик, аудитор и главный бизнес-консультант строительного гипермаркета Barg.tj.\n"
        "Твоя задача — анализировать финансовое состояние магазина, давать точные отчеты, хвалить лучших курьеров, "
        "указывать на риски дефицита товаров и помогать родителю бизнеса принимать правильные решения.\n\n"
        "ПРАВИЛА:\n"
        "1. Отвечай на том языке, на котором к тебе обратился директор (тоҷикӣ или русский).\n"
        "2. Будь вежлив, говори уважительно и профессионально, но простым языком без заумной терминологии.\n"
        "3. Работай строго на основе предоставленных данных. Не выдумывай другие показатели.\n"
        "4. Всегда делай акцент на Фоидаи Соф (чистой прибыли), так как это реальные деньги владельца.\n"
        "5. Дай краткие рекомендации по закупке дефицитных товаров.\n\n"
        f"{financial_context}"
    )

    # 3. Запрос ба ИИ
    ai_response = ask_ai(system_prompt, message)
    
    return Response({
        "response": ai_response
    }, status=status.HTTP_200_OK)
