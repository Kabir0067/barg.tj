from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAdminUser, BasePermission, SAFE_METHODS
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Q

from .models import (
    Customer, Address, Category, Product, Order
)
from .serializers import (
    CategorySerializer, ProductSerializer, CustomerSerializer,
    OrderReadSerializer, CreateOrderSerializer, UpdateOrderStatusSerializer,
    QuickSaleSerializer, RegisterSerializer, LoginSerializer
)


class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user and request.user.is_staff


class CategoryViewSet(viewsets.ModelViewSet):
    """
    Эндпоинтҳо барои категорияҳо
    """
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    lookup_field = 'slug'


class ProductPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 100


class ProductViewSet(viewsets.ModelViewSet):
    """
    Эндпоинтҳо барои маҳсулотҳо
    """
    queryset = Product.objects.filter(is_active=True).select_related('category')
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrReadOnly]
    lookup_field = 'slug'
    pagination_class = ProductPagination

    def get_queryset(self):
        queryset = self.queryset
        category_slug = self.request.query_params.get('category')
        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)
        
        search_query = self.request.query_params.get('search')
        if search_query:
            words = search_query.split()
            q_objects = Q()
            for word in words:
                q_objects &= (
                    Q(name_tj__icontains=word) | 
                    Q(name_ru__icontains=word) |
                    Q(sku__icontains=word) |
                    Q(category__name_tj__icontains=word) |
                    Q(category__name_ru__icontains=word)
                )
            queryset = queryset.filter(q_objects)
        return queryset


class OrderViewSet(viewsets.ModelViewSet):
    """
    Эндпоинтҳо барои заказҳо
    """
    queryset = Order.objects.all().prefetch_related('items__product').select_related('customer', 'assigned_worker')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateOrderSerializer
        elif self.action in ['update', 'partial_update']:
            return UpdateOrderStatusSerializer
        return OrderReadSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return self.queryset
        return self.queryset.filter(customer=user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        read_serializer = OrderReadSerializer(order, context={'request': request})
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def quick_sale(self, request):
        """
        POST /api/orders/quick_sale/
        Фурӯши дастӣ дар мағоза: захира фавран кам ва ба фоида ҳисоб мешавад.
        """
        serializer = QuickSaleSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        return Response(
            OrderReadSerializer(order, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )


@api_view(['GET'])
@permission_classes([IsAdminUser])
def staff_list(request):
    """
    GET /api/staff/
    Рӯйхати кормандон (барои таъини курьер ба заказ)
    """
    workers = Customer.objects.filter(is_staff=True).values('id', 'name', 'phone')
    return Response(list(workers))


def _issue_tokens(user):
    """JWT (access + refresh) барои корбар месозад."""
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
        'user': CustomerSerializer(user).data,
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """
    POST /api/auth/register/
    Сабтиноми ҳисоби нав бо рақами телефон + ном + ПАРОЛ.
    """
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    return Response(_issue_tokens(user), status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """
    POST /api/auth/login/
    Воридшавӣ бо рақами телефон ва ПАРОЛ (на бепарол).
    """
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.validated_data['user']
    return Response(_issue_tokens(user), status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_me(request):
    """
    GET /api/auth/me/
    Маълумот дар бораи муштарии ҷорӣ
    """
    return Response(CustomerSerializer(request.user).data)