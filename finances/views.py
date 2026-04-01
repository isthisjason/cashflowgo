from .models import Transaction, Subscription, Budget
from rest_framework.response import Response
from .serializers import TransactionSerializer, SubscriptionSerializer, BudgetSerializer
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from finances.utils import send_notification_email
from finances.utils import process_subscription_reminders
import hashlib
import logging

# Configure logging (optional: configure in settings for better control)
logger = logging.getLogger(__name__)

from rest_framework.exceptions import ValidationError

class AddTransactionView(APIView):
    def post(self, request, *args, **kwargs):
        print("=== Incoming AddTransaction Request ===")
        print("Request cookies:", request.COOKIES)
        print(f"Session ID from cookies: {request.COOKIES.get('sessionid')}")
        print(f"CSRF Token from cookies: {request.COOKIES.get('csrftoken')}")
        print("Request headers:", request.headers)
        print(f"Request user: {request.user}")
        print(f"Is user authenticated? {request.user.is_authenticated}")
        print("Incoming request data:", request.data)

        if not request.user.is_authenticated:
            print("User is not authenticated. Rejecting request.")
            return Response({'detail': 'Authentication required'}, status=401)

        # Extract transaction data
        active_profile = request.data.get('profile_type', 'personal')
        amount = request.data.get('amount')
        category = request.data.get('category', 'Uncategorized')
        date = request.data.get('date')

        print(f"Active Profile: {active_profile}")

        # Generate unique hash for the transaction
        hash_input = f"{amount}{category}{date}{active_profile}{request.user.id}"
        unique_hash = hashlib.md5(hash_input.encode()).hexdigest()

        # Debugging logs
        print(f"Hash input: {hash_input}")
        print(f"Generated unique hash: {unique_hash}")

        # Check for duplicates
        existing_transaction = Transaction.objects.filter(unique_hash=unique_hash).first()
        if existing_transaction:
            print(f"Duplicate transaction detected. Returning existing transaction with hash: {unique_hash}")
            serializer = TransactionSerializer(existing_transaction)
            return Response(serializer.data, status=200)  # Return the existing transaction with a 200 status

        # Proceed with saving the transaction
        data = request.data.copy()
        data['user'] = request.user.id
        data['profile_type'] = active_profile

        serializer = TransactionSerializer(data=data)
        if serializer.is_valid():
            saved_transaction = serializer.save(unique_hash=unique_hash)  # Save with unique hash
            print("Transaction saved successfully:", saved_transaction)

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
                print("Budget alert email sent to:", request.user.email)

            return Response(serializer.data, status=201)

        print("Transaction validation failed:", serializer.errors)
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
        if profile_type not in ["personal", "business", "family"]:
            return Response({"error": f"Invalid profile type: {profile_type}. Must be one of personal, business, family."}, status=400)

        user = request.user
        income_field = f"adjusted_income_{profile_type}"

        if not hasattr(user, income_field):
            return Response({"error": f"User does not have an income field for profile type {profile_type}."}, status=400)

        return Response({income_field: getattr(user, income_field)})

    def patch(self, request, profile_type):
        """
        Update the adjusted income for the given profile type.
        """
        if profile_type not in ["personal", "business", "family"]:
            return Response({"error": f"Invalid profile type: {profile_type}. Must be one of personal, business, family."}, status=400)

        new_income = request.data.get("adjusted_income")
        if new_income is None:
            return Response({"error": "No income value provided."}, status=400)

        try:
            new_income = float(new_income)
        except ValueError:
            return Response({"error": "Invalid income value. Must be a number."}, status=400)

        user = request.user
        income_field = f"adjusted_income_{profile_type}"

        if not hasattr(user, income_field):
            return Response({"error": f"User does not have an income field for profile type {profile_type}."}, status=400)

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

        print(f"All Transactions for {user.email}: {transactions.count()}")
        print("Transactions:", list(transactions.values('id', 'amount', 'category', 'date')))

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

        print(f"Created subscription: {subscription.name}, Email: {subscription.email}, Expiry: {subscription.expiry_date}, Reminder Days: {subscription.reminder_days}")

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
            print(f"Creation email sent successfully to {subscription.email}")
        except Exception as e:
            print(f"Failed to send creation email to {subscription.email}: {e}")

        # Trigger reminder logic for all subscriptions
        try:
            process_subscription_reminders()
            print("Reminder logic triggered after subscription creation.")
        except Exception as e:
            print(f"Failed to trigger reminder logic: {e}")


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

        print(f"Updated subscription: {subscription.name}, Email: {subscription.email}, Expiry: {subscription.expiry_date}, Reminder Days: {subscription.reminder_days}")

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
            print(f"Update email sent successfully to {subscription.email}")
        except Exception as e:
            print(f"Failed to send update email to {subscription.email}: {e}")

        # Trigger reminder logic for all subscriptions
        try:
            process_subscription_reminders()
            print("Reminder logic triggered after subscription update.")
        except Exception as e:
            print(f"Failed to trigger reminder logic: {e}")

    def perform_destroy(self, instance):
        if instance.user != self.request.user:
            raise PermissionDenied("You do not have permission to delete this subscription.")
        instance.delete()


class BudgetView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile_type = request.query_params.get('profile_type', 'personal')
        print("Received profile_type:", profile_type)

        if not profile_type:
            return Response({"detail": "Profile type is required."}, status=status.HTTP_400_BAD_REQUEST)

        budget = Budget.objects.get_or_create(user=request.user, profile_type=profile_type)[0]
        current_spending = budget.calculate_current_spending()
        serializer = BudgetSerializer(budget)
        data = serializer.data
        data['current_spending'] = current_spending
        return Response(data)

    def post(self, request):
        profile_type = request.data.get('profile_type')
        if not profile_type:
            return Response({"detail": "Profile type is required."}, status=status.HTTP_400_BAD_REQUEST)

        budget = Budget.objects.get_or_create(user=request.user, profile_type=profile_type)[0]
        print("POST Data Received:", request.data)

        serializer = BudgetSerializer(budget, data=request.data, partial=True)
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
            print("Serializer errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)