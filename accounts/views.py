from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.views.decorators.csrf import ensure_csrf_cookie
from django.middleware.csrf import get_token
from rest_framework.views import APIView
from rest_framework import status
from django.utils.decorators import method_decorator
from django.contrib.auth import get_user_model
import logging

logger = logging.getLogger(__name__)

User = get_user_model()

@method_decorator(ensure_csrf_cookie, name='dispatch')
class LoginView(APIView):
    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        password = request.data.get('password')

        logger.info("Login attempt email=%s", email)

        # Authenticate user
        user = authenticate(username=email, password=password)

        if user:
            if not user.is_active:
                logger.warning("Inactive user login attempt email=%s", email)
                return Response({'error': 'User is inactive.'}, status=status.HTTP_401_UNAUTHORIZED)

            login(request, user)
            csrf_token = get_token(request)
            logger.info("Login success user_id=%s", user.id)
            return Response({
                "message": "Login successful",
                "csrf_token": csrf_token,
                "is_authenticated": True,
                "user": {
                    "email": user.email,
                    "id": user.id,
                }
            }, status=status.HTTP_200_OK)
        else:
            logger.warning("Login failed email=%s", email)
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
def user_logout(request):
    """
    Handles API-based logout for React frontend.
    """
    logger.info("Logout user_id=%s", getattr(request.user, "id", None))
    logout(request)  # Log the user out and clear the session
    csrf_token = get_token(request)  # Generate a new CSRF token for security
    return Response({
        "message": "Logged out successfully.",
        "csrf_token": csrf_token,
        "is_authenticated": False
    }, status=200)

@api_view(['POST'])
def signup_view(request):
    """
    Handles user signup for React frontend.
    """
    username = request.data.get('username')  # New username field
    email = request.data.get('email')
    password = request.data.get('password')

    if not username or not email or not password:
        return Response(
            {"error": "Username, email, and password are required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check if the username or email already exists
    if User.objects.filter(username=username).exists():
        return Response(
            {"error": "A user with this username already exists."},
            status=status.HTTP_400_BAD_REQUEST
        )
    if User.objects.filter(email=email).exists():
        return Response(
            {"error": "A user with this email already exists."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Create and save the user
    user = User.objects.create_user(username=username, email=email, password=password)
    user.is_active = True  # Activate the user by default
    user.save()

    return Response(
        {"message": "User created successfully."},
        status=status.HTTP_201_CREATED
    )
    
@api_view(['GET'])
@ensure_csrf_cookie
def get_csrf_token(request):
    """
    Provides a CSRF token to the frontend.
    """
    return Response({"message": "CSRF token set successfully."})

@api_view(['GET'])
def check_authentication(request):
    """
    Verifies if the user is authenticated.
    """
    if request.user.is_authenticated:
        return Response({"is_authenticated": True, "user": {"email": request.user.email}})
    return Response({"is_authenticated": False}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['GET'])
@ensure_csrf_cookie
def debug_csrf(request):
    csrf_token = get_token(request)
    return Response({"csrf_token": csrf_token})

@api_view(['GET'])
def debug_auth_state(request):
    if request.user.is_authenticated:
        return Response({
            "is_authenticated": True,
            "user": {
                "id": request.user.id,
                "email": request.user.email
            }
        })
    return Response({"is_authenticated": False}, status=401)
