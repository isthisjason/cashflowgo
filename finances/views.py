from .models import Transaction, Subscription, Budget
from rest_framework.response import Response
from .serializers import (
    TransactionSerializer,
    SubscriptionSerializer,
    BudgetSerializer,
    ProfileTypeSerializer,
    AdjustedIncomeUpdateSerializer,
    BudgetUpdateRequestSerializer,
)
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from finances.utils import send_notification_email
from finances.utils import process_subscription_reminders
import logging
import csv
from datetime import datetime
from django.http import HttpResponse
from django.db.models import Sum

# Configure logging (optional: configure in settings for better control)
logger = logging.getLogger(__name__)

from rest_framework.exceptions import ValidationError

class AddTransactionView(APIView):
    def post(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            logger.warning("Unauthenticated add transaction attempt")
            return Response({'detail': 'Authentication required'}, status=401)

        # Extract transaction data
        active_profile = request.data.get('profile_type', 'personal')
        amount = request.data.get('amount')
        category = request.data.get('category', 'Uncategorized')
        date = request.data.get('date')

        # Generate unique hash for the transaction
        unique_hash = Transaction.build_unique_hash(
            amount=amount,
            category=category,
            date_value=date,
            profile_type=active_profile,
            user_id=request.user.id,
        )

        # Check for duplicates
        existing_transaction = Transaction.objects.filter(unique_hash=unique_hash).first()
        if existing_transaction:
            logger.info("Duplicate transaction detected user_id=%s hash=%s", request.user.id, unique_hash)
            serializer = TransactionSerializer(existing_transaction)
            return Response(serializer.data, status=200)  # Return the existing transaction with a 200 status

        # Proceed with saving the transaction
        data = request.data.copy()
        data['user'] = request.user.id
        data['profile_type'] = active_profile

        serializer = TransactionSerializer(data=data)
        if serializer.is_valid():
            saved_transaction = serializer.save(unique_hash=unique_hash)  # Save with unique hash
            logger.info("Transaction saved user_id=%s transaction_id=%s", request.user.id, saved_transaction.id)

            # Check if this transaction causes the user to go over budget
            budget = Budget.objects.get_or_create(user=request.user, profile_type=active_profile)[0]
            current_spending = budget.calculate_current_spending()
            if current_spending > budget.monthly_limit:
                # Send budget alert email
                subject = f"Budget Alert: {active_profile} Budget Exceeded"
                message = (
                    f"Hi {request.user.email},\n\n"
                    f"You have exceeded your monthly budget for {active_profile}.\n"
                    f"Current spending: ${current_spending}\n"
                    f"Monthly limit: ${budget.monthly_limit}\n\n"
                    f"Best regards,\nCashFlowGo Team"
                )
                send_notification_email(subject, message, [request.user.email])
                logger.info("Budget alert email sent user_id=%s", request.user.id)

            return Response(serializer.data, status=201)

        logger.warning("Transaction validation failed errors=%s", serializer.errors)
        return Response(serializer.errors, status=400)

class TransactionsView(APIView):
    def get(self, request, profile_type, *args, **kwargs):
        user = request.user
        if not user.is_authenticated:
            return Response({'detail': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

        # Fetch the most recent 8 transactions for the user and profile type
        transactions = (
            Transaction.objects
            .filter(user=user, profile_type=profile_type)  # Updated to use profile_type
            .order_by('-date')[:8]
        )
        serializer = TransactionSerializer(transactions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdjustedIncomeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, profile_type):
        """
        Fetch the adjusted income for the given profile type.
        """
        profile_serializer = ProfileTypeSerializer(data={"profile_type": profile_type})
        if not profile_serializer.is_valid():
            return Response(profile_serializer.errors, status=400)
        normalized_profile = profile_serializer.validated_data["profile_type"]

        user = request.user
        income_field = f"adjusted_income_{normalized_profile}"

        if not hasattr(user, income_field):
            return Response({"error": f"User does not have an income field for profile type {normalized_profile}."}, status=400)

        return Response({income_field: getattr(user, income_field)})

    def patch(self, request, profile_type):
        """
        Update the adjusted income for the given profile type.
        """
        profile_serializer = ProfileTypeSerializer(data={"profile_type": profile_type})
        if not profile_serializer.is_valid():
            return Response(profile_serializer.errors, status=400)
        normalized_profile = profile_serializer.validated_data["profile_type"]

        income_serializer = AdjustedIncomeUpdateSerializer(data=request.data)
        if not income_serializer.is_valid():
            return Response(income_serializer.errors, status=400)
        new_income = income_serializer.validated_data["adjusted_income"]

        user = request.user
        income_field = f"adjusted_income_{normalized_profile}"

        if not hasattr(user, income_field):
            return Response({"error": f"User does not have an income field for profile type {normalized_profile}."}, status=400)

        setattr(user, income_field, new_income)
        user.save()

        return Response({"message": "Income updated successfully.", income_field: getattr(user, income_field)})


class AllTransactionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        profile_type = request.query_params.get('profile_type', None)

        # Fetch all transactions for the user
        transactions = Transaction.objects.filter(user=user).order_by('-date')

        # Apply profile_type filter if specified
        if profile_type:
            transactions = transactions.filter(profile_type=profile_type)

        logger.debug("All transactions fetched user_id=%s count=%s", user.id, transactions.count())

        serializer = TransactionSerializer(transactions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class SubscriptionListCreateView(ListCreateAPIView):
    serializer_class = SubscriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        profile_type = self.request.query_params.get('profile_type')
        if not profile_type:
            raise PermissionDenied("Profile type is required.")

        return Subscription.objects.filter(user=self.request.user, profile_type=profile_type)

    def perform_create(self, serializer):
        profile_type = self.request.data.get('profile_type')
        if not profile_type:
            raise PermissionDenied("Profile type is required.")

        subscription = serializer.save(user=self.request.user, profile_type=profile_type)

        logger.info("Created subscription id=%s user_id=%s", subscription.id, self.request.user.id)

        # Immediate notification
        subject = f"Subscription Added: {subscription.name}"
        message = (
            f"Hi,\n\n"
            f"Your subscription to {subscription.name} has been added and will expire on {subscription.expiry_date}.\n"
            f"Please take note of the expiry date and ensure it is renewed on time.\n\n"
            f"Best regards,\nCashFlowGo Team"
        )
        try:
            send_notification_email(subject, message, [subscription.email])
            logger.info("Subscription creation email sent subscription_id=%s", subscription.id)
        except Exception as e:
            logger.exception("Subscription creation email failed subscription_id=%s", subscription.id)

        # Trigger reminder logic for all subscriptions
        try:
            process_subscription_reminders()
            logger.debug("Triggered subscription reminders after create")
        except Exception as e:
            logger.exception("Failed to trigger reminder logic after create")


class SubscriptionDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class = SubscriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Subscription.objects.filter(user=self.request.user)

    def perform_update(self, serializer):
        instance = self.get_object()
        if instance.user != self.request.user:
            raise PermissionDenied("You do not have permission to edit this subscription.")

        subscription = serializer.save()

        logger.info("Updated subscription id=%s user_id=%s", subscription.id, self.request.user.id)

        # Immediate notification about the update
        update_subject = f"Subscription Updated: {subscription.name}"
        update_message = (
            f"Hi,\n\n"
            f"Your subscription to {subscription.name} has been updated.\n"
            f"The updated expiry date is {subscription.expiry_date}.\n"
            f"Please take note of the changes and ensure it is renewed on time.\n\n"
            f"Best regards,\nCashFlowGo Team"
        )
        try:
            send_notification_email(update_subject, update_message, [subscription.email])
            logger.info("Subscription update email sent subscription_id=%s", subscription.id)
        except Exception as e:
            logger.exception("Subscription update email failed subscription_id=%s", subscription.id)

        # Trigger reminder logic for all subscriptions
        try:
            process_subscription_reminders()
            logger.debug("Triggered subscription reminders after update")
        except Exception as e:
            logger.exception("Failed to trigger reminder logic after update")

    def perform_destroy(self, instance):
        if instance.user != self.request.user:
            raise PermissionDenied("You do not have permission to delete this subscription.")
        instance.delete()


class BudgetView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile_type = request.query_params.get('profile_type', 'personal')
        profile_serializer = ProfileTypeSerializer(data={"profile_type": profile_type})
        if not profile_serializer.is_valid():
            return Response(profile_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        profile_type = profile_serializer.validated_data["profile_type"]
        logger.debug("Budget fetch profile_type=%s user_id=%s", profile_type, request.user.id)

        budget = Budget.objects.get_or_create(user=request.user, profile_type=profile_type)[0]
        current_spending = budget.calculate_current_spending()
        serializer = BudgetSerializer(budget)
        data = serializer.data
        data['current_spending'] = current_spending
        return Response(data)

    def post(self, request):
        request_serializer = BudgetUpdateRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            return Response(request_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        validated = request_serializer.validated_data
        profile_type = validated["profile_type"]

        budget = Budget.objects.get_or_create(user=request.user, profile_type=profile_type)[0]
        logger.debug("Budget update profile_type=%s user_id=%s", profile_type, request.user.id)

        serializer = BudgetSerializer(budget, data=validated, partial=True)
        if serializer.is_valid():
            saved_budget = serializer.save(user=request.user, profile_type=profile_type)

            # Immediate notification if user exceeds their budget
            if saved_budget.is_over_budget():
                subject = f"Budget Alert: {saved_budget.profile_type} Budget Exceeded"
                message = (
                    f"Hi {request.user.email},\n\n"
                    f"You have exceeded your monthly budget for {saved_budget.profile_type}.\n"
                    f"Current spending: ${saved_budget.calculate_current_spending()}\n"
                    f"Monthly limit: ${saved_budget.monthly_limit}\n\n"
                    f"Best regards,\nCashFlowGo Team"
                )
                send_notification_email(subject, message, [request.user.email])

            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            logger.warning("Budget serializer errors=%s", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MonthlyReportCSVView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile_type = request.query_params.get("profile_type", "personal")
        profile_serializer = ProfileTypeSerializer(data={"profile_type": profile_type})
        if not profile_serializer.is_valid():
            return Response(profile_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        profile_type = profile_serializer.validated_data["profile_type"]

        month_param = request.query_params.get("month")
        if month_param:
            try:
                report_month = datetime.strptime(month_param, "%Y-%m")
            except ValueError:
                return Response(
                    {"month": ["Invalid format. Use YYYY-MM."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            report_month = datetime.utcnow()

        start_date = report_month.replace(day=1).date()
        if start_date.month == 12:
            end_date = start_date.replace(year=start_date.year + 1, month=1, day=1)
        else:
            end_date = start_date.replace(month=start_date.month + 1, day=1)

        transactions = (
            Transaction.objects.filter(
                user=request.user,
                profile_type=profile_type,
                date__gte=start_date,
                date__lt=end_date,
            )
            .order_by("-date", "-id")
        )

        totals = transactions.values("transaction_type").annotate(total=Sum("amount"))
        income_total = next((row["total"] for row in totals if row["transaction_type"] == "Income"), 0) or 0
        expense_total = next((row["total"] for row in totals if row["transaction_type"] == "Expense"), 0) or 0
        net_total = income_total - expense_total

        filename = f"cashflowgo-{profile_type}-{start_date.strftime('%Y-%m')}.csv"
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow(["CashFlowGo Monthly Report"])
        writer.writerow(["Profile", profile_type])
        writer.writerow(["Month", start_date.strftime("%Y-%m")])
        writer.writerow(["Income Total", income_total])
        writer.writerow(["Expense Total", expense_total])
        writer.writerow(["Net Total", net_total])
        writer.writerow([])
        writer.writerow(["Date", "Type", "Category", "Amount"])

        for txn in transactions:
            writer.writerow([txn.date.isoformat(), txn.transaction_type, txn.category, txn.amount])

        logger.info(
            "CSV report generated user_id=%s profile_type=%s month=%s rows=%s",
            request.user.id,
            profile_type,
            start_date.strftime("%Y-%m"),
            transactions.count(),
        )
        return response
