from rest_framework import serializers
from .models import Transaction
from .models import Subscription
from .models import Budget

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = '__all__'

    def validate(self, data):
        # Example validation: Ensure amount is positive
        if data['amount'] <= 0:
            raise serializers.ValidationError({"amount": "Amount must be greater than zero."})
        return data
    
class SubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = [
            'id',
            'name',
            'amount',
            'start_date',
            'expiry_date',
            'reminder_days',
            'email',
            'profile_type',
        ]

    def validate(self, data):
        if data['amount'] <= 0:
            raise serializers.ValidationError({"amount": "Amount must be greater than zero."})
        if data['expiry_date'] < data['start_date']:
            raise serializers.ValidationError({"expiry_date": "Expiry date cannot be earlier than start date."})
        return data
    
class BudgetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Budget
        fields = ['id', 'email', 'monthly_limit', 'profile_type', 'created_at', 'updated_at']

    def validate_monthly_limit(self, value):
        if value < 0:
            raise serializers.ValidationError("Monthly limit must be non-negative.")
        return value


class ProfileTypeSerializer(serializers.Serializer):
    profile_type = serializers.ChoiceField(choices=["personal", "business", "family"])


class AdjustedIncomeUpdateSerializer(serializers.Serializer):
    adjusted_income = serializers.FloatField()


class BudgetUpdateRequestSerializer(serializers.Serializer):
    profile_type = serializers.ChoiceField(choices=["personal", "business", "family"])
    monthly_limit = serializers.FloatField(min_value=0, required=False)
