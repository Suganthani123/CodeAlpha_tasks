from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.contrib.auth.forms import UserCreationForm
from django.db import models  # ← IMPORTANT: Add this for search
from .models import Product, Cart, CartItem, Order

def get_cart(request):
    if request.user.is_authenticated:
        cart, created = Cart.objects.get_or_create(user=request.user)
    else:
        if not request.session.session_key:
            request.session.create()
        cart, created = Cart.objects.get_or_create(session_key=request.session.session_key)
    return cart

def home(request):
    products = Product.objects.all()
    cart = get_cart(request)
    return render(request, 'home.html', {
        'products': products, 
        'cart_count': cart.total_items
    })

def add_to_cart(request, product_id):
    cart = get_cart(request)
    product = get_object_or_404(Product, id=product_id)
    quantity = int(request.POST.get('quantity', 1))
    
    cart_item, created = CartItem.objects.get_or_create(cart=cart, product=product)
    if not created:
        cart_item.quantity += quantity
    else:
        cart_item.quantity = quantity
    cart_item.save()
    
    messages.success(request, f'{product.name} added to cart!')
    return redirect('home')

def view_cart(request):
    cart = get_cart(request)
    return render(request, 'cart.html', {'cart': cart})

@login_required
def checkout(request):
    cart = get_cart(request)
    
    if cart.items.count() == 0:
        messages.error(request, 'Your cart is empty!')
        return redirect('cart')
    
    if request.method == 'POST':
        full_name = request.POST.get('full_name', '')
        address = request.POST.get('address', '')
        city = request.POST.get('city', '')
        pincode = request.POST.get('pincode', '')
        phone = request.POST.get('phone', '')
        payment_method = request.POST.get('payment_method', 'cod')
        
        full_address = f"{full_name}\n{address}\n{city} - {pincode}"
        
        order = Order.objects.create(
            user=request.user,
            cart=cart,
            total_amount=cart.total_price,
            shipping_address=full_address,
            phone=phone,
            status='pending'
        )
        
        cart.items.all().delete()
        
        messages.success(request, f'✅ Order placed successfully! Order ID: #{order.id}')
        return redirect('orders')
    
    return render(request, 'checkout.html', {'cart': cart})

@login_required
def orders(request):
    user_orders = Order.objects.filter(user=request.user).order_by('-created_at')
    return render(request, 'orders.html', {'orders': user_orders})

def register(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, 'Registration successful!')
            return redirect('home')
    else:
        form = UserCreationForm()
    return render(request, 'register.html', {'form': form})

def user_login(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)
            messages.success(request, 'Login successful!')
            return redirect('home')
        else:
            messages.error(request, 'Invalid username or password!')
    return render(request, 'login.html')

def user_logout(request):
    logout(request)
    messages.success(request, 'Logged out successfully!')
    return redirect('home')

def remove_from_cart(request, item_id):
    cart_item = get_object_or_404(CartItem, id=item_id)
    cart_item.delete()
    messages.success(request, 'Item removed from cart!')
    return redirect('cart')

# ============================================
# 🔍 SEARCH FUNCTION - ADD THIS AT THE BOTTOM
# ============================================

def search_products(request):
    query = request.GET.get('q', '')
    if query:
        # Search by name or description or category
        products = Product.objects.filter(
            models.Q(name__icontains=query) | 
            models.Q(description__icontains=query) |
            models.Q(category__icontains=query)
        )
    else:
        products = Product.objects.all()
    
    cart = get_cart(request)
    return render(request, 'home.html', {
        'products': products, 
        'cart_count': cart.total_items,
        'search_query': query
    })