from django.urls import path
from .views import (
    dashboard, revenue_chart, top_products, 
    top_customers, low_stock, category_breakdown, 
    couriers, export_orders_csv
)

app_name = 'analytics'

urlpatterns = [
    path('dashboard/', dashboard, name='dashboard'),
    path('revenue/', revenue_chart, name='revenue'),
    path('top-products/', top_products, name='top_products'),
    path('top-customers/', top_customers, name='top_customers'),
    path('low-stock/', low_stock, name='low_stock'),
    path('category-breakdown/', category_breakdown, name='category_breakdown'),
    path('couriers/', couriers, name='couriers'),
    path('export/', export_orders_csv, name='export_csv'),
]
