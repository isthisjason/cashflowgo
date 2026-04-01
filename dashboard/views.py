from django.db.models import Sum
from finances.models import Transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from datetime import timedelta
from django.utils.timezone import now
from rest_framework.permissions import IsAuthenticated

class SummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, profile, frequency):
        if frequency not in ["weekly", "monthly", "yearly"]:
            return Response({"error": "Invalid frequency"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            summary_data = self.get_summary_data(request.user, profile, frequency)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if not summary_data or not summary_data.get("labels"):
            return Response({"error": "No data found"}, status=status.HTTP_404_NOT_FOUND)

        return Response(summary_data, status=status.HTTP_200_OK)

    def get_summary_data(self, user, profile, frequency):
        today = now().date()

        # Calculate start date based on frequency
        if frequency == "weekly":
            start_date = today - timedelta(days=7)
        elif frequency == "monthly":
            start_date = today.replace(day=1)  # First day of the current month
        elif frequency == "yearly":
            start_date = today.replace(month=1, day=1)  # First day of the current year

        # Aggregate transactions by profile and date
        normalized_profile = profile.lower()
        transactions = Transaction.objects.filter(
            user=user,
            profile_type=normalized_profile,
            date__gte=start_date,
        )
        income = transactions.filter(transaction_type="Income").values("date").annotate(total=Sum("amount"))
        expenses = transactions.filter(transaction_type="Expense").values("date").annotate(total=Sum("amount"))

        # Generate labels and aggregate data
        labels = sorted(
            list(set(trans["date"].strftime("%Y-%m-%d") for trans in income.union(expenses, all=True)))
        )
        income_dict = {trans["date"].strftime("%Y-%m-%d"): trans["total"] for trans in income}
        expense_dict = {trans["date"].strftime("%Y-%m-%d"): trans["total"] for trans in expenses}
        income_data = [income_dict.get(label, 0) for label in labels]
        expense_data = [expense_dict.get(label, 0) for label in labels]

        return {
            "labels": labels,
            "income": income_data,
            "expenses": expense_data,
        }
    
class SpendingHabitsView(APIView):
    """
    API View to aggregate transaction data by category for spending habits.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        profile = kwargs.get("profile", "personal").lower()

        # Filter transactions by profile
        transactions = Transaction.objects.filter(user=request.user, profile_type=profile, transaction_type="Expense")

        # Aggregate spending by category
        category_data = (
            transactions
            .values('category')  # Group by category
            .annotate(total_spent=Sum('amount'))  # Calculate total spending per category
            .order_by('-total_spent')  # Order by descending total spending
        )

        # Format the response
        response_data = {
            "categories": [entry['category'] or "Uncategorized" for entry in category_data],
            "amounts": [entry['total_spent'] for entry in category_data],
        }

        return Response(response_data)
