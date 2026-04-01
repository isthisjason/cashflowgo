from django import forms
from .models import Transaction
from .models import Budget

class BudgetForm(forms.ModelForm):
    class Meta:
        model = Budget
        fields = ['amount', 'category', 'start_date', 'end_date'] 

class TransactionForm(forms.ModelForm):
    class Meta:
        model = Transaction
        fields = ['amount', 'transaction_type', 'profile_type', 'date']
        widgets = {
            'profile_type': forms.Select(choices=Transaction.PROFILE_TYPES),
        }