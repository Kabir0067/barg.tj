import random
import string
from decimal import Decimal
from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.validators import RegexValidator
from datetime import timedelta

phone_validator = RegexValidator(
    regex=r'^\+?992?\d{9}$',
    message='Рақами телефон бояд дар формати +992XXXXXXXXX бошад'
)


class CustomerManager(BaseUserManager):
    def _normalize_phone(self, phone):
        phone = ''.join(c for c in phone if c.isdigit() or c == '+')
        if not phone.startswith('+'):
            if phone.startswith('992'):
                phone = '+' + phone
            elif len(phone) == 9:
                phone = '+992' + phone
        return phone

    def create_user(self, phone, name='', **extra_fields):
        if not phone:
            raise ValueError('Рақами телефон ҳатмист')
        phone = self._normalize_phone(phone)
        user = self.model(phone=phone, name=name, **extra_fields)
        user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, phone, name='', password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_verified', True)
        user = self.create_user(phone, name=name, **extra_fields)
        if password:
            user.set_password(password)
            user.save(using=self._db)
        return user

    def get_or_create_guest(self, phone, name='', **extra):
        phone = self._normalize_phone(phone)
        customer, created = self.get_or_create(
            phone=phone,
            defaults={'name': name, **extra}
        )
        if not created and name and not customer.name:
            customer.name = name
            customer.save(update_fields=['name'])
        return customer, created


class Customer(AbstractBaseUser, PermissionsMixin):
    phone = models.CharField(
        'Рақами телефон',
        max_length=20,
        unique=True,
        validators=[phone_validator],
        db_index=True,
    )
    name = models.CharField('Ном', max_length=120, blank=True)
    
    is_verified = models.BooleanField(
        'Тасдиқшуда',
        default=False,
        help_text='Оё муштарӣ тасдиқ шудааст?'
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    last_order_at = models.DateTimeField(null=True, blank=True)
    total_spent = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text='Маблағи умумии хариди ҳамаи заказҳо'
    )
    orders_count = models.PositiveIntegerField(default=0)

    USERNAME_FIELD = 'phone'
    REQUIRED_FIELDS = []

    objects = CustomerManager()

    class Meta:
        verbose_name = 'Муштарӣ'
        verbose_name_plural = 'Муштариён'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name or "Меҳмон"} ({self.phone})'

    @property
    def is_guest(self):
        return not self.is_verified


class Address(models.Model):
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name='addresses'
    )
    title = models.CharField(
        'Номи адрес', max_length=50, blank=True,
        help_text='Масалан: "Хона", "Кор"'
    )
    village = models.CharField('Деҳа/Шаҳр', max_length=100)
    street = models.CharField('Кӯча', max_length=200, blank=True)
    house = models.CharField('Хона/Ҳавлӣ', max_length=50, blank=True)
    landmark = models.TextField(
        'Нишона',
        blank=True,
        help_text='Назди мағозаи Аҳмад, пушти масҷид ва ғ.'
    )
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Адрес'
        verbose_name_plural = 'Адресҳо'
        ordering = ['-is_default', '-created_at']

    def __str__(self):
        parts = [self.village, self.street, self.house]
        return ', '.join(p for p in parts if p)

    def save(self, *args, **kwargs):
        if not self.pk and not self.customer.addresses.exists():
            self.is_default = True
        super().save(*args, **kwargs)


class OTPCode(models.Model):
    phone = models.CharField(max_length=20, db_index=True)
    code = models.CharField(max_length=6)
    is_used = models.BooleanField(default=False)
    attempts = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['phone', '-created_at']),
        ]

    def __str__(self):
        return f'{self.phone}: {self.code}'

    @classmethod
    def generate(cls, phone, length=4, expiry_minutes=5):
        cls.objects.filter(phone=phone, is_used=False).update(is_used=True)
        code = ''.join(random.choices(string.digits, k=length))
        return cls.objects.create(
            phone=phone,
            code=code,
            expires_at=timezone.now() + timedelta(minutes=expiry_minutes)
        )

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    @property
    def is_valid(self):
        return not self.is_used and not self.is_expired and self.attempts < 3


class Category(models.Model):
    name_tj = models.CharField('Ном (тҷ)', max_length=100)
    name_ru = models.CharField('Имя (ру)', max_length=100)
    slug = models.SlugField(unique=True)
    icon = models.CharField('Иконка (Emoji ё Синф)', max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Категория'
        verbose_name_plural = 'Категорияҳо'

    def __str__(self):
        return self.name_tj


class Product(models.Model):
    category = models.ForeignKey(
        Category, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='products',
        verbose_name='Категория'
    )
    name_tj = models.CharField('Номи маҳсулот (тҷ)', max_length=255)
    name_ru = models.CharField('Имя товара (ру)', max_length=255)
    slug = models.SlugField(unique=True)
    price = models.DecimalField('Нарх', max_digits=10, decimal_places=2)
    cost_price = models.DecimalField('Нархи харид (Себестоимость)', max_digits=10, decimal_places=2, default=0)
    sku = models.CharField('Артикул', max_length=50, unique=True)
    stock = models.IntegerField('Маҷмӯъ', default=0)
    low_stock_threshold = models.IntegerField('Ҳадди ақалли захира', default=5)
    unit = models.CharField('Воҳиди ченкунӣ', max_length=20, default='шт')
    description_tj = models.TextField('Тавсиф (тҷ)', blank=True)
    description_ru = models.TextField('Описание (ру)', blank=True)
    image = models.ImageField('Расми маҳсулот', upload_to='products/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Маҳсулот'
        verbose_name_plural = 'Маҳсулотҳо'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name_tj} ({self.sku})'

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            import uuid
            # simple translit map for cyrillic to latin slug
            cyr_map = {
                'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
                'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
                'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts',
                'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu',
                'я': 'ya', 'ӣ': 'i', 'ӯ': 'u', 'ҳ': 'h', 'ҷ': 'j', 'қ': 'q', 'ғ': 'g'
            }
            name_lower = (self.name_ru or self.name_tj or "").lower()
            translated = "".join(cyr_map.get(c, c) for c in name_lower)
            base = slugify(translated)
            if not base:
                base = "product"
            self.slug = f"{base}-{self.sku or uuid.uuid4().hex[:6]}"
        super().save(*args, **kwargs)


class OrderStatus(models.TextChoices):
    NEW = 'NEW', 'Нав (Омодасозӣ)'
    ACCEPTED = 'ACCEPTED', 'Қабулшуда'
    DELIVERING = 'DELIVERING', 'Дар роҳ'
    COMPLETED = 'COMPLETED', 'Супорида шуд'
    CANCELLED = 'CANCELLED', 'Бекор шуд'


class PaymentMethod(models.TextChoices):
    CASH = 'CASH', 'Нақдӣ (Ба курьер)'
    CARD = 'CARD', 'Корти Миллӣ (Алиф/Душанбе Сити)'
    TERMINAL = 'TERMINAL', 'Тавассути терминал'


class Order(models.Model):
    number = models.CharField('Рақами заказ', max_length=20, unique=True, db_index=True)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders',
        verbose_name='Муштарӣ'
    )
    customer_name = models.CharField('Номи муштарӣ', max_length=120)
    customer_phone = models.CharField('Телефони муштарӣ', max_length=20)
    
    address_village = models.CharField('Деҳа/Шаҳр', max_length=100)
    address_street = models.CharField('Кӯча', max_length=200, blank=True)
    address_house = models.CharField('Хона', max_length=50, blank=True)
    address_landmark = models.TextField('Нишона/Ориентир', blank=True)
    address_lat = models.FloatField('Аввалият (latitude)', null=True, blank=True)
    address_lng = models.FloatField('Дарозӣ (longitude)', null=True, blank=True)
    
    status = models.CharField(
        'Ҳолати заказ',
        max_length=20,
        choices=OrderStatus.choices,
        default=OrderStatus.NEW,
        db_index=True
    )
    payment_method = models.CharField(
        'Усули пардохт',
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CASH
    )
    notes = models.TextField('Эзоҳ/Таманниёт', blank=True)
    
    subtotal = models.DecimalField('Суммаи маҳсулот', max_digits=12, decimal_places=2, default=0)
    delivery_fee = models.DecimalField('Нархи дастраскунӣ', max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField('Умумӣ', max_digits=12, decimal_places=2, default=0)
    
    created_at = models.DateTimeField('Санаи супориш', auto_now_add=True, db_index=True)
    accepted_at = models.DateTimeField('Қабул шуд', null=True, blank=True)
    delivering_at = models.DateTimeField('Дар роҳ', null=True, blank=True)
    completed_at = models.DateTimeField('Анҷом ёфт', null=True, blank=True)
    
    assigned_worker = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tasks',
        verbose_name='Корманд'
    )

    class Meta:
        verbose_name = 'Заказ'
        verbose_name_plural = 'Заказҳо'
        ordering = ['-created_at']

    def __str__(self):
        return f'Закази № {self.number}'

    def save(self, *args, **kwargs):
        if not self.number:
            last_order = Order.objects.all().order_by('id').last()
            if last_order:
                try:
                    last_num = int(last_order.number.split('-')[1])
                    new_num = last_num + 1
                except (IndexError, ValueError):
                    new_num = 10001
            else:
                new_num = 10001
            self.number = f'BRG-{new_num}'
        
        if self.pk:
            old_order = Order.objects.get(pk=self.pk)
            if old_order.status != self.status:
                if self.status == OrderStatus.ACCEPTED:
                    self.accepted_at = timezone.now()
                elif self.status == OrderStatus.DELIVERING:
                    self.delivering_at = timezone.now()
                elif self.status == OrderStatus.COMPLETED:
                    self.completed_at = timezone.now()
                    if self.customer:
                        self.customer.total_spent += self.total
                        self.customer.orders_count += 1
                        self.customer.last_order_at = timezone.now()
                        self.customer.save(update_fields=['total_spent', 'orders_count', 'last_order_at'])
                elif self.status == OrderStatus.CANCELLED and old_order.status != OrderStatus.CANCELLED:
                    # Заказ бекор шуд — молҳоро ба анбор бармегардонем
                    for item in self.items.select_related('product'):
                        if item.product:
                            item.product.stock += item.quantity
                            item.product.save(update_fields=['stock'])
        super().save(*args, **kwargs)

    def calculate_total(self):
        self.subtotal = sum(item.subtotal for item in self.items.all())
        if self.subtotal >= 5000:
            self.delivery_fee = Decimal('0')
        else:
            self.delivery_fee = Decimal('20.00')
        self.total = self.subtotal + self.delivery_fee


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='Заказ'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        related_name='order_items',
        verbose_name='Маҳсулот'
    )
    product_name = models.CharField('Номи маҳсулот дар вақти заказ', max_length=255)
    price_at_order = models.DecimalField('Нарх дар вақти заказ', max_digits=10, decimal_places=2)
    cost_price_at_order = models.DecimalField('Нархи харид дар вақти заказ', max_digits=10, decimal_places=2, default=0)
    quantity = models.PositiveIntegerField('Миқдор', default=1)

    class Meta:
        verbose_name = 'Қисми заказ'
        verbose_name_plural = 'Қисмҳои заказ'

    def __str__(self):
        return f'{self.product_name} x {self.quantity}'

    @property
    def subtotal(self):
        return self.price_at_order * self.quantity