from django.contrib import admin
from .models import Product, Cart, CartItem, Order

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'price', 'category', 'stock', 'rating']
    list_filter = ['category']
    search_fields = ['name', 'description']

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'created_at', 'total_items']

@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ['cart', 'product', 'quantity']

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'total_amount', 'status', 'created_at']
    list_filter = ['status']
    list_editable = ['status']  # ← THIS LINE LETS YOU CHANGE STATUS DIRECTLY!
    search_fields = ['user__username', 'id']