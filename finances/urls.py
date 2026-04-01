from django.urls import path
from .views import AddTransactionView
from .views import TransactionsView
from .views import AdjustedIncomeView
from .views import AllTransactionsView
from .views import SubscriptionListCreateView, SubscriptionDetailView
from .views import BudgetView

urlpatterns = [
    # add transaction button   
    path('add-transaction/', AddTransactionView.as_view(), name='add-transaction'),

    # recent transactions
    path('transactions/<str:profile_type>/', TransactionsView.as_view(), name='transactions-view'),\
    
    # income slider
    path('adjusted-income/<str:profile_type>/', AdjustedIncomeView.as_view(), name='adjusted-income'),

    # transactions page
    path('transactionspage/all/', AllTransactionsView.as_view(), name='all-transactions'),

    # subscriptions page
    path('subscriptions/', SubscriptionListCreateView.as_view(), name='subscriptions'),
    path('subscriptions/<int:pk>/', SubscriptionDetailView.as_view(), name='subscription-detail'),

    # budget 
    path('budget/', BudgetView.as_view(), name='budget'),
]
