from django.db import transaction
from rest_framework import permissions
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken

from pdf_web.users.api.serializers import AccountActionSerializer


def blacklist_user_tokens(user) -> None:
    for token in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=token)


class DeactivateAccountAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "auth"

    def post(self, request):
        serializer = AccountActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not request.user.check_password(serializer.validated_data["password"]):
            return Response(
                {"detail": "Password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        request.user.is_active = False
        request.user.save(update_fields=["is_active"])
        blacklist_user_tokens(request.user)
        return Response({"detail": "Account deactivated."}, status=status.HTTP_200_OK)


class DeleteAccountAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "auth"

    def delete(self, request):
        serializer = AccountActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not request.user.check_password(serializer.validated_data["password"]):
            return Response(
                {"detail": "Password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            blacklist_user_tokens(request.user)
            request.user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
