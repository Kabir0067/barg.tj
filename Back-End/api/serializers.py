import io
from decimal import Decimal
from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from PIL import Image as PilImage

from .models import (
    Customer, Address, Category, Product, 
    Order, OrderItem, OrderStatus, PaymentMethod
)
from .telegram import send_telegram_notification


def normalize_phone(value):
    """
    Рақами телефонро ба формати ягонаи +992XXXXXXXXX табдил медиҳад.
    Барои ҳама ҷойҳои дохилкунии телефон истифода мешавад.
    """
    value = ''.join(c for c in (value or '') if c.isdigit() or c == '+')
    if not value.startswith('+'):
        if value.startswith('992'):
            value = '+' + value
        elif len(value) == 9:
            value = '+992' + value
    if not value.startswith('+992') or len(value) != 13:
        raise serializers.ValidationError(
            'Рақами телефони нодуруст. Намуна: +992988123456'
        )
    return value


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name_tj', 'name_ru', 'slug', 'icon']


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name_tj', read_only=True)
    # FileField — Django ImageField validation-ро bypаss мекунад;
    # validate_image дар поён форматро ба JPEG табдил медиҳад
    image = serializers.FileField(required=False, allow_null=True, use_url=True)

    class Meta:
        model = Product
        fields = [
            'id', 'category', 'category_name', 'name_tj', 'name_ru',
            'slug', 'price', 'cost_price', 'sku', 'stock', 'low_stock_threshold',
            'unit', 'description_tj', 'description_ru', 'image', 'is_active', 'created_at'
        ]
        read_only_fields = ['slug', 'created_at']

    def validate_image(self, image):
        """Ҳар формати расм (WEBP, HEIC, PNG, JPG)-ро ба JPEG табдил медиҳад."""
        if not image:
            return image
        try:
            img = PilImage.open(image)
            if img.mode in ('RGBA', 'P', 'LA'):
                bg = PilImage.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                bg.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                img = bg
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            buf = io.BytesIO()
            img.save(buf, format='JPEG', quality=88, optimize=True)
            buf.seek(0)
            name = image.name.rsplit('.', 1)[0] + '.jpg'
            return ContentFile(buf.read(), name=name)
        except Exception:
            raise serializers.ValidationError('Расм нодуруст аст. JPG, PNG ё WEBP бор кунед.')


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            'id', 'phone', 'name', 'is_verified', 'is_staff',
            'created_at', 'total_spent', 'orders_count', 'last_order_at'
        ]


class OrderItemReadSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'price_at_order', 'quantity', 'subtotal']


class OrderItemWriteSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)

    def validate_product_id(self, value):
        try:
            self.product = Product.objects.get(pk=value, is_active=True)
        except Product.DoesNotExist:
            raise serializers.ValidationError('Маҳсулот ёфт нашуд')
        return value

    def validate(self, attrs):
        if self.product.stock < attrs['quantity']:
            raise serializers.ValidationError({
                'quantity': f'Танҳо {self.product.stock} {self.product.unit} дар анбор мавҷуд аст'
            })
        return attrs


class OrderReadSerializer(serializers.ModelSerializer):
    items = OrderItemReadSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_method_display = serializers.CharField(
        source='get_payment_method_display', read_only=True
    )
    assigned_worker_name = serializers.CharField(
        source='assigned_worker.name', read_only=True, default=''
    )

    class Meta:
        model = Order
        fields = [
            'id', 'number', 'status', 'status_display',
            'payment_method', 'payment_method_display',
            'customer_name', 'customer_phone',
            'address_village', 'address_street', 'address_house', 'address_landmark',
            'address_lat', 'address_lng',
            'subtotal', 'delivery_fee', 'total',
            'items', 'notes',
            'assigned_worker', 'assigned_worker_name',
            'created_at', 'accepted_at', 'delivering_at', 'completed_at',
        ]


class CreateOrderSerializer(serializers.Serializer):
    customer_name = serializers.CharField(max_length=120)
    customer_phone = serializers.CharField(max_length=20)

    address_village = serializers.CharField(max_length=100)
    address_street = serializers.CharField(max_length=200, required=False, allow_blank=True)
    address_house = serializers.CharField(max_length=50, required=False, allow_blank=True)
    address_landmark = serializers.CharField(required=False, allow_blank=True)
    address_lat = serializers.FloatField(required=False, allow_null=True)
    address_lng = serializers.FloatField(required=False, allow_null=True)

    items = OrderItemWriteSerializer(many=True, min_length=1)
    payment_method = serializers.ChoiceField(
        choices=PaymentMethod.choices,
        default=PaymentMethod.CASH
    )
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate_customer_phone(self, value):
        value = ''.join(c for c in value if c.isdigit() or c == '+')
        if not value.startswith('+'):
            if value.startswith('992'):
                value = '+' + value
            elif len(value) == 9:
                value = '+992' + value
        if not value.startswith('+992') or len(value) != 13:
            raise serializers.ValidationError(
                'Рақами телефони нодуруст. Намуна: +992988123456'
            )
        return value

    def validate_items(self, value):
        product_ids = [item['product_id'] for item in value]
        if len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError(
                'Маҳсулоти такрорӣ дар рӯйхат. Миқдорро дар як сатр ҷамъ кунед.'
            )
        return value

    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get('request')
        items_data = validated_data.pop('items')

        # 1. Муштариро пайдо мекунем ё месозем
        if request and request.user.is_authenticated:
            customer = request.user
            if not customer.name and validated_data['customer_name']:
                customer.name = validated_data['customer_name']
                customer.save(update_fields=['name'])
        else:
            customer, _ = Customer.objects.get_or_create_guest(
                phone=validated_data['customer_phone'],
                name=validated_data['customer_name'],
            )

        # 2. Фармоиш (Order) месозем
        order = Order.objects.create(
            customer=customer,
            customer_name=validated_data['customer_name'],
            customer_phone=validated_data['customer_phone'],
            address_village=validated_data['address_village'],
            address_street=validated_data.get('address_street', ''),
            address_house=validated_data.get('address_house', ''),
            address_landmark=validated_data.get('address_landmark', ''),
            address_lat=validated_data.get('address_lat'),
            address_lng=validated_data.get('address_lng'),
            payment_method=validated_data.get('payment_method', PaymentMethod.CASH),
            notes=validated_data.get('notes', ''),
        )

        # 3. Қисмҳои фармоишро (OrderItems) месозем ва захираро кам мекунем
        for item_data in items_data:
            product = Product.objects.select_for_update().get(pk=item_data['product_id'])
            
            if product.stock < item_data['quantity']:
                raise serializers.ValidationError({
                    'items': f'{product.name_tj}: танҳо {product.stock} адад дар анбор мондааст'
                })

            OrderItem.objects.create(
                order=order,
                product=product,
                product_name=product.name_tj,
                price_at_order=product.price,
                cost_price_at_order=product.cost_price,
                quantity=item_data['quantity'],
            )
            product.stock -= item_data['quantity']
            product.save(update_fields=['stock'])

        # 4. Ҳисоб кардани умумӣ ва сабт
        order.calculate_total()
        order.save()

        # 5. Фиристодани хабар ба Telegram
        send_telegram_notification(order)

        return order

    def to_representation(self, instance):
        return OrderReadSerializer(instance, context=self.context).data


class UpdateOrderStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['status', 'assigned_worker']
        extra_kwargs = {
            'status': {'required': False},
            'assigned_worker': {'required': False, 'allow_null': True},
        }


class QuickSaleSerializer(serializers.Serializer):
    """
    Фурӯши дастӣ дар мағоза — админ як ё якчанд молро фурӯхт,
    захира фавран кам мешавад ва ба ҳисоботи фоида дохил мешавад.
    """
    items = OrderItemWriteSerializer(many=True, min_length=1)
    customer_name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    customer_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    payment_method = serializers.ChoiceField(
        choices=PaymentMethod.choices,
        default=PaymentMethod.CASH
    )
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate_items(self, value):
        product_ids = [item['product_id'] for item in value]
        if len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError(
                'Маҳсулоти такрорӣ дар рӯйхат. Миқдорро дар як сатр ҷамъ кунед.'
            )
        return value

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        phone = (validated_data.get('customer_phone') or '').strip()

        customer = None
        if phone:
            customer, _ = Customer.objects.get_or_create_guest(
                phone=phone,
                name=validated_data.get('customer_name', ''),
            )

        order = Order.objects.create(
            customer=customer,
            customer_name=validated_data.get('customer_name') or 'Фурӯши дастӣ',
            customer_phone=phone or '—',
            address_village='Мағоза (фурӯши дастӣ)',
            payment_method=validated_data.get('payment_method', PaymentMethod.CASH),
            notes=validated_data.get('notes', ''),
            status=OrderStatus.COMPLETED,
            completed_at=timezone.now(),
            delivery_fee=Decimal('0'),
        )

        for item_data in items_data:
            product = Product.objects.select_for_update().get(pk=item_data['product_id'])
            if product.stock < item_data['quantity']:
                raise serializers.ValidationError({
                    'items': f'{product.name_tj}: танҳо {product.stock} {product.unit} дар анбор мондааст'
                })
            OrderItem.objects.create(
                order=order,
                product=product,
                product_name=product.name_tj,
                price_at_order=product.price,
                cost_price_at_order=product.cost_price,
                quantity=item_data['quantity'],
            )
            product.stock -= item_data['quantity']
            product.save(update_fields=['stock'])

        order.subtotal = sum(i.subtotal for i in order.items.all())
        order.total = order.subtotal
        order.save(update_fields=['subtotal', 'total'])

        # Агар муштарии шинохта бошад, ҳисоби хариди ӯро навсозӣ мекунем
        if customer:
            customer.total_spent += order.total
            customer.orders_count += 1
            customer.last_order_at = timezone.now()
            customer.save(update_fields=['total_spent', 'orders_count', 'last_order_at'])

        return order

    def to_representation(self, instance):
        return OrderReadSerializer(instance, context=self.context).data


class PhoneLoginSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=20)
    name = serializers.CharField(max_length=120, required=False, allow_blank=True)

    def validate_phone(self, value):
        return normalize_phone(value)


class RegisterSerializer(serializers.Serializer):
    """
    Сабтиноми муштарӣ бо парол.
    Рақами телефон + ном + парол — ҳисоби бехатари шахсӣ месозад.
    """
    phone = serializers.CharField(max_length=20)
    name = serializers.CharField(max_length=120)
    password = serializers.CharField(min_length=6, max_length=128, write_only=True)

    def validate_phone(self, value):
        return normalize_phone(value)

    def validate(self, attrs):
        existing = Customer.objects.filter(phone=attrs['phone']).first()
        if existing and existing.has_usable_password():
            raise serializers.ValidationError({
                'phone': 'Ин рақам аллакай сабт шудааст. Лутфан ворид шавед.'
            })
        return attrs

    def create(self, validated_data):
        phone = validated_data['phone']
        # Агар муштарӣ ҳамчун меҳмон харид карда бошад — ҳамон ҳисобро фаъол мекунем
        user, _ = Customer.objects.get_or_create(
            phone=phone,
            defaults={'name': validated_data['name']}
        )
        if validated_data.get('name'):
            user.name = validated_data['name']
        user.is_verified = True
        user.set_password(validated_data['password'])
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    """
    Воридшавии муштарӣ бо рақами телефон ва парол.
    """
    phone = serializers.CharField(max_length=20)
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        phone = normalize_phone(attrs.get('phone'))
        password = attrs.get('password') or ''

        invalid = serializers.ValidationError({
            'detail': 'Рақами телефон ё парол нодуруст аст.'
        })

        user = Customer.objects.filter(phone=phone).first()
        if user is None or not user.has_usable_password() or not user.check_password(password):
            raise invalid
        if not user.is_active:
            raise serializers.ValidationError({
                'detail': 'Ҳисоби шумо ғайрифаъол аст. Бо дастгирӣ тамос гиред.'
            })

        attrs['user'] = user
        return attrs