from django.urls import path
from .views import signup_view, user_logout, check_authentication
from .views import LoginView
from .views import get_csrf_token

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),   # Login endpoint

    path('signup/', signup_view, name='signup'),  # Signup endpoint

    path('logout/', user_logout, name='logout'), # Logout endpoint

    path('csrf/', get_csrf_token, name='get_csrf_token'),
    path('check-authentication/', check_authentication, name='check-authentication'),
]
