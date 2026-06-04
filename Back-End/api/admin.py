from django.contrib import admin
from django.utils.html import format_html
from .models import Customer, Address, Category, Product, Order, OrderItem


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('phone', 'name', 'is_verified', 'total_spent', 'orders_count', 'last_order_at', 'created_at')
    list_filter = ('is_verified', 'is_staff', 'is_active', 'created_at')
    search_fields = ('phone', 'name')
    ordering = ('-created_at',)
    readonly_fields = ('total_spent', 'orders_count', 'last_order_at', 'created_at')


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ('customer', 'village', 'street', 'house', 'is_default', 'created_at')
    list_filter = ('is_default', 'created_at', 'village')
    search_fields = ('customer__phone', 'customer__name', 'village', 'landmark')


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name_tj', 'name_ru', 'slug', 'icon_preview', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name_tj', 'name_ru', 'slug')
    prepopulated_fields = {'slug': ('name_tj',)}
    
    def icon_preview(self, obj):
        if obj.icon:
            return format_html('<span style="font-size: 1.2rem;">{}</span>', obj.icon)
        return "-"
    icon_preview.short_description = "Иконка"


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('sku', 'name_tj', 'category', 'price_display', 'stock_status', 'stock', 'unit', 'is_active')
    list_filter = ('category', 'is_active', 'created_at')
    search_fields = ('sku', 'name_tj', 'name_ru')
    prepopulated_fields = {'slug': ('name_tj',)}
    list_editable = ('stock', 'is_active')

    def price_display(self, obj):
        return format_html('<b>{} TJS</b>', obj.price)
    price_display.short_description = "Нарх"

    def stock_status(self, obj):
        if obj.stock == 0:
            return format_html('<span style="color: red; font-weight: bold;">Тамом шуд</span>')
        elif obj.stock <= obj.low_stock_threshold:
            return format_html('<span style="color: orange; font-weight: bold;">Кам монд ({})</span>', obj.stock)
        return format_html('<span style="color: green;">{}</span>', obj.stock)
    stock_status.short_description = "Анбор"


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('subtotal',)
    raw_id_fields = ('product',)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('number', 'customer_name', 'customer_phone', 'status_badge', 'payment_method_display', 'total_display', 'created_at')
    list_filter = ('status', 'payment_method', 'created_at')
    search_fields = ('number', 'customer_name', 'customer_phone', 'address_village')
    readonly_fields = ('number', 'subtotal', 'total', 'created_at', 'accepted_at', 'delivering_at', 'completed_at')
    inlines = [OrderItemInline]
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Маълумоти асосӣ', {
            'fields': ('number', 'status', 'assigned_worker')
        }),
        ('Муштарӣ', {
            'fields': ('customer', 'customer_name', 'customer_phone')
        }),
        ('Адрес ва Дастраскунӣ', {
            'fields': ('address_village', 'address_street', 'address_house', 'address_landmark', 'address_lat', 'address_lng')
        }),
        ('Ҳисоббаробарӣ', {
            'fields': ('payment_method', 'subtotal', 'delivery_fee', 'total', 'notes')
        }),
        ('Хронология', {
            'fields': ('created_at', 'accepted_at', 'delivering_at', 'completed_at')
        })
    )

    def total_display(self, obj):
        return format_html('<b>{} TJS</b>', obj.total)
    total_display.short_description = "Ҷамъ"

    def payment_method_display(self, obj):
        return obj.get_payment_method_display()
    payment_method_display.short_description = "Тарзи пардохт"

    def status_badge(self, obj):
        colors = {
            'NEW': 'blue',
            'ACCEPTED': 'purple',
            'DELIVERING': 'orange',
            'COMPLETED': 'green',
            'CANCELLED': 'red',
        }
        color = colors.get(obj.status, 'black')
        return format_html('<span style="color: {}; font-weight: bold;">● {}</span>', color, obj.get_status_display())
    status_badge.short_description = "Ҳолат"
