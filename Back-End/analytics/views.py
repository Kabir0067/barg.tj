import csv
from datetime import timedelta, date
from decimal import Decimal
from django.db.models import (
    Sum, Count, Avg, F, Q, DecimalField
)
from django.db.models.functions import (
    TruncDate, TruncMonth, TruncHour, Coalesce
)
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from api.models import (
    Customer, Product, Category, Order, OrderItem, OrderStatus, PaymentMethod
)


def _date_range(request):
    """
    Периоди санаҳо барои филтри ҳисоботҳо
    """
    today = timezone.now().date()
    from_str = request.query_params.get('from')
    to_str = request.query_params.get('to')

    try:
        date_from = date.fromisoformat(from_str) if from_str else today - timedelta(days=30)
    except ValueError:
        date_from = today - timedelta(days=30)
    try:
        date_to = date.fromisoformat(to_str) if to_str else today
    except ValueError:
        date_to = today

    return date_from, date_to


@api_view(['GET'])
@permission_classes([IsAdminUser])
def dashboard(request):
    """
    GET /api/analytics/dashboard/
    Панели асосии роҳбар: Даромад, Фоидаи соф, Захираҳои анбор
    """
    date_from, date_to = _date_range(request)
    today = timezone.now().date()
    yesterday = today - timedelta(days=1)
    month_ago = today - timedelta(days=30)
    prev_month = today - timedelta(days=60)

    completed = Order.objects.filter(status=OrderStatus.COMPLETED)

    # 1. Имрӯз
    today_orders = Order.objects.filter(created_at__date=today)
    today_revenue = completed.filter(completed_at__date=today).aggregate(
        s=Coalesce(Sum('total'), Decimal('0'))
    )['s']
    
    # Фоидаи софи имрӯз = Фурӯш - Себестоимость
    today_profit = OrderItem.objects.filter(
        order__status=OrderStatus.COMPLETED,
        order__completed_at__date=today
    ).aggregate(
        p=Coalesce(Sum((F('price_at_order') - F('cost_price_at_order')) * F('quantity')), Decimal('0'))
    )['p']

    # 2. Дирӯз
    yesterday_orders = Order.objects.filter(created_at__date=yesterday).count()
    yesterday_revenue = completed.filter(completed_at__date=yesterday).aggregate(
        s=Coalesce(Sum('total'), Decimal('0'))
    )['s']
    yesterday_profit = OrderItem.objects.filter(
        order__status=OrderStatus.COMPLETED,
        order__completed_at__date=yesterday
    ).aggregate(
        p=Coalesce(Sum((F('price_at_order') - F('cost_price_at_order')) * F('quantity')), Decimal('0'))
    )['p']

    # 3. 30 Рӯзи охир
    month_orders = Order.objects.filter(created_at__date__gte=month_ago)
    month_revenue = completed.filter(completed_at__date__gte=month_ago).aggregate(
        s=Coalesce(Sum('total'), Decimal('0'))
    )['s']
    month_profit = OrderItem.objects.filter(
        order__status=OrderStatus.COMPLETED,
        order__completed_at__date__gte=month_ago
    ).aggregate(
        p=Coalesce(Sum((F('price_at_order') - F('cost_price_at_order')) * F('quantity')), Decimal('0'))
    )['p']

    # Муқоиса бо моҳи гузашта
    prev_month_revenue = completed.filter(
        completed_at__date__gte=prev_month,
        completed_at__date__lt=month_ago,
    ).aggregate(s=Coalesce(Sum('total'), Decimal('0')))['s']
    
    prev_month_profit = OrderItem.objects.filter(
        order__status=OrderStatus.COMPLETED,
        order__completed_at__date__gte=prev_month,
        order__completed_at__date__lt=month_ago
    ).aggregate(
        p=Coalesce(Sum((F('price_at_order') - F('cost_price_at_order')) * F('quantity')), Decimal('0'))
    )['p']

    def growth(curr, prev):
        if prev and prev > 0:
            return round((curr - prev) / prev * 100, 1)
        return None

    # Ҳолати супоришҳо
    by_status = dict(
        Order.objects.values_list('status').annotate(c=Count('id')).values_list('status', 'c')
    )

    # Миёнаи харид (AOV)
    aov = completed.filter(
        completed_at__date__gte=date_from,
        completed_at__date__lte=date_to,
    ).aggregate(a=Coalesce(Avg('total'), Decimal('0')))['a']

    # Захираи анбор
    low_stock_count = Product.objects.filter(
        is_active=True,
        stock__lte=F('low_stock_threshold'),
        stock__gt=0,
    ).count()
    out_of_stock_count = Product.objects.filter(is_active=True, stock=0).count()

    # Маҳсулоти анбор бо нархгузорӣ (Себестоимость ва фурӯш)
    inventory_val = Product.objects.filter(is_active=True).aggregate(
        wholesale=Coalesce(Sum(F('cost_price') * F('stock'), output_field=DecimalField(max_digits=14, decimal_places=2)), Decimal('0')),
        retail=Coalesce(Sum(F('price') * F('stock'), output_field=DecimalField(max_digits=14, decimal_places=2)), Decimal('0'))
    )
    total_wholesale = inventory_val['wholesale']
    total_retail = inventory_val['retail']
    potential_profit = total_retail - total_wholesale

    # Маблағи зарурӣ барои пурра кардани захираи анбори молҳои каммонда
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

    return Response({
        'today': {
            'date': today,
            'orders_count': today_orders.count(),
            'revenue': today_revenue,
            'net_profit': today_profit,
        },
        'comparison': {
            'orders_growth': growth(today_orders.count(), yesterday_orders),
            'revenue_growth_dod': growth(today_revenue, yesterday_revenue),
            'profit_growth_dod': growth(today_profit, yesterday_profit),
            'profit_growth_mom': growth(month_profit, prev_month_profit),
        },
        'month': {
            'orders_count': month_orders.count(),
            'revenue': month_revenue,
            'net_profit': month_profit,
            'average_order_value': round(aov, 2) if aov else 0,
        },
        'orders_by_status': {
            'new': by_status.get(OrderStatus.NEW, 0),
            'accepted': by_status.get(OrderStatus.ACCEPTED, 0),
            'delivering': by_status.get(OrderStatus.DELIVERING, 0),
            'completed': by_status.get(OrderStatus.COMPLETED, 0),
            'cancelled': by_status.get(OrderStatus.CANCELLED, 0),
        },
        'inventory': {
            'total_products': Product.objects.filter(is_active=True).count(),
            'low_stock': low_stock_count,
            'out_of_stock': out_of_stock_count,
            'total_wholesale_value': total_wholesale,
            'total_retail_value': total_retail,
            'potential_profit': potential_profit,
            'restock_budget_needed': restock_budget,
        },
        'kpi': {
            'margin_percentage': month_margin,
            'order_conversion_rate': conversion_rate,
        },
        'total_customers': Customer.objects.filter(is_verified=True).count(),
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def revenue_chart(request):
    """
    GET /api/analytics/revenue/
    Маълумот барои графики даромад ва фоидаи соф дар як вақт
    """
    date_from, date_to = _date_range(request)
    period = request.query_params.get('period', 'day')

    trunc_map = {
        'hour': TruncHour('order__completed_at'),
        'day': TruncDate('order__completed_at'),
        'month': TruncMonth('order__completed_at'),
    }
    trunc = trunc_map.get(period, TruncDate('order__completed_at'))

    # Муайян кардани фоидаи соф ва даромад аз рӯи рӯзҳо
    data = (
        OrderItem.objects.filter(
            order__status=OrderStatus.COMPLETED,
            order__completed_at__date__gte=date_from,
            order__completed_at__date__lte=date_to,
        )
        .annotate(period=trunc)
        .values('period')
        .annotate(
            revenue=Sum(F('price_at_order') * F('quantity'), output_field=DecimalField(max_digits=12, decimal_places=2)),
            net_profit=Sum((F('price_at_order') - F('cost_price_at_order')) * F('quantity'), output_field=DecimalField(max_digits=12, decimal_places=2)),
            items_sold=Sum('quantity'),
        )
        .order_by('period')
    )

    return Response({
        'period': period,
        'from': date_from,
        'to': date_to,
        'data': list(data),
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def top_products(request):
    """
    GET /api/analytics/top-products/
    Товарҳои серфурӯш бо даромад ва фоидаи соф
    """
    date_from, date_to = _date_range(request)
    limit = int(request.query_params.get('limit', 10))

    items = (
        OrderItem.objects.filter(
            order__status=OrderStatus.COMPLETED,
            order__completed_at__date__gte=date_from,
            order__completed_at__date__lte=date_to,
        )
        .values('product_id', 'product__name_tj', 'product__sku')
        .annotate(
            total_quantity=Sum('quantity'),
            total_revenue=Sum(F('price_at_order') * F('quantity'),
                              output_field=DecimalField(max_digits=14, decimal_places=2)),
            total_profit=Sum((F('price_at_order') - F('cost_price_at_order')) * F('quantity'),
                             output_field=DecimalField(max_digits=14, decimal_places=2)),
            orders_count=Count('order_id', distinct=True),
        )
        .order_by('-total_profit')[:limit]
    )

    return Response({
        'from': date_from,
        'to': date_to,
        'products': list(items),
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def top_customers(request):
    """
    GET /api/analytics/top-customers/
    Харидорони VIP бо ҳаҷми харид
    """
    limit = int(request.query_params.get('limit', 10))
    customers = (
        Customer.objects.filter(orders_count__gt=0)
        .order_by('-total_spent')[:limit]
        .values('id', 'phone', 'name', 'orders_count', 'total_spent', 'last_order_at')
    )
    return Response(list(customers))


@api_view(['GET'])
@permission_classes([IsAdminUser])
def low_stock(request):
    """
    GET /api/analytics/low-stock/
    Молҳои каммонда
    """
    qs = Product.objects.filter(is_active=True, stock__lte=F('low_stock_threshold'))
    data = list(qs.values(
        'id', 'name_tj', 'sku', 'stock', 'low_stock_threshold', 'price', 'unit'
    ).order_by('stock'))

    return Response({
        'count': len(data),
        'products': data
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def category_breakdown(request):
    """
    GET /api/analytics/category-breakdown/
    Даромад ва фоида аз рӯи категорияҳо
    """
    date_from, date_to = _date_range(request)

    data = (
        OrderItem.objects.filter(
            order__status=OrderStatus.COMPLETED,
            order__completed_at__date__gte=date_from,
            order__completed_at__date__lte=date_to,
        )
        .values('product__category__id', 'product__category__name_tj', 'product__category__icon')
        .annotate(
            revenue=Sum(F('price_at_order') * F('quantity'),
                        output_field=DecimalField(max_digits=14, decimal_places=2)),
            net_profit=Sum((F('price_at_order') - F('cost_price_at_order')) * F('quantity'),
                           output_field=DecimalField(max_digits=14, decimal_places=2)),
            quantity=Sum('quantity'),
        )
        .order_by('-net_profit')
    )
    return Response(list(data))


@api_view(['GET'])
@permission_classes([IsAdminUser])
def couriers(request):
    """
    GET /api/analytics/couriers/
    Ҳисоботи коргарони дастраскунанда (курьерҳо): Супоришҳои иҷрошуда ва маблағҳо
    """
    today = timezone.now().date()
    
    couriers_data = (
        Order.objects.filter(
            status=OrderStatus.COMPLETED,
            assigned_worker__isnull=False
        )
        .values('assigned_worker_id', 'assigned_worker__name', 'assigned_worker__phone')
        .annotate(
            total_orders=Count('id'),
            total_collected=Sum('total'),
            cash_collected=Sum('total', filter=Q(payment_method=PaymentMethod.CASH)),
            card_collected=Sum('total', filter=Q(payment_method=PaymentMethod.CARD)),
            terminal_collected=Sum('total', filter=Q(payment_method=PaymentMethod.TERMINAL)),
        )
        .order_by('-total_orders')
    )
    
    return Response(list(couriers_data))


@api_view(['GET'])
@permission_classes([IsAdminUser])
def export_orders_csv(request):
    """
    GET /api/analytics/export/
    Экспорт ба CSV барои Бухгалтерия (бо себестоимость ва фоидаи соф)
    """
    date_from, date_to = _date_range(request)

    response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
    response['Content-Disposition'] = f'attachment; filename="bookkeeping_orders_{date_from}_{date_to}.csv"'
    response.write('\ufeff')

    writer = csv.writer(response)
    writer.writerow([
        'Рақами заказ', 'Санаи супориш', 'Муштарӣ', 'Телефон', 'Адрес',
        'Рӯйхати молҳо', 'Суммаи маҳсулот', 'Себестоимость (Нархи харид)', 
        'Нархи дастраскунӣ', 'Умумӣ', 'Фоидаи софи супориш',
        'Ҳолат', 'Усули пардохт', 'Курьер'
    ])

    orders = Order.objects.filter(
        created_at__date__gte=date_from,
        created_at__date__lte=date_to,
    ).prefetch_related('items').select_related('assigned_worker').order_by('-created_at')

    for o in orders:
        items_text = '; '.join(
            f'{i.product_name} × {i.quantity}' for i in o.items.all()
        )
        address = f'{o.address_village}, {o.address_street} {o.address_house}'.strip()
        
        # Ҳисоб кардани себестоимость-и заказ
        order_cost = sum(i.cost_price_at_order * i.quantity for i in o.items.all())
        order_profit = o.subtotal - order_cost  # Фоидаи соф аз фурӯши мол

        writer.writerow([
            o.number,
            o.created_at.strftime('%d.%m.%Y %H:%M'),
            o.customer_name,
            o.customer_phone,
            address,
            items_text,
            o.subtotal,
            order_cost,
            o.delivery_fee,
            o.total,
            order_profit,
            o.get_status_display(),
            o.get_payment_method_display(),
            o.assigned_worker.name if o.assigned_worker else '',
        ])

    return response
