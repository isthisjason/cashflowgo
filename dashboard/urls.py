from django.urls import path
from .views import SummaryView
from .views import SpendingHabitsView

urlpatterns = [
    # summary chart
    path('summary/<str:profile>/<str:frequency>/', SummaryView.as_view(), name='summary'),

    # spending habits chart
    path('spending-habits/<str:profile>/', SpendingHabitsView.as_view(), name='spending-habits'),
]