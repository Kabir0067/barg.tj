from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    CategoryViewSet, ProductViewSet, OrderViewSet,
    register, login, get_me, staff_list
)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'orders', OrderViewSet, basename='order')

urlpatterns = [
    # Router endpoints (catalog and orders)
    path('', include(router.urls)),

    # Staff (couriers) list for order assignment
    path('staff/', staff_list, name='staff_list'),

    # Password-based authentication
    path('auth/register/', register, name='register'),
    path('auth/login/', login, name='login'),
    path('auth/me/', get_me, name='get_me'),
]
