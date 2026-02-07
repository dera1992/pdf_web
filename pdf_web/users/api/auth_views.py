from allauth.socialaccount.providers.facebook.views import FacebookOAuth2Adapter
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import RegisterView
from dj_rest_auth.registration.views import SocialLoginView
from dj_rest_auth.views import LoginView
from dj_rest_auth.views import PasswordChangeView
from dj_rest_auth.views import PasswordResetConfirmView
from dj_rest_auth.views import PasswordResetView
from rest_framework import permissions
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from pdf_web.users.api.serializers import LoginSerializer
from pdf_web.users.api.serializers import LogoutSerializer
from pdf_web.users.api.serializers import RegisterSerializer
from pdf_web.users.api.serializers import UserDetailsSerializer


class RegisterAPIView(RegisterView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"


class LoginAPIView(LoginView):
    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserDetailsSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )


class LogoutAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "auth"

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        refresh = RefreshToken(serializer.validated_data["refresh"])
        refresh.blacklist()
        return Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)


class PasswordForgotAPIView(PasswordResetView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"


class PasswordResetConfirmAPIView(PasswordResetConfirmView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"


class PasswordChangeAPIView(PasswordChangeView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "auth"


class GoogleSocialLoginAPIView(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    client_class = OAuth2Client
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"


class FacebookSocialLoginAPIView(SocialLoginView):
    adapter_class = FacebookOAuth2Adapter
    client_class = OAuth2Client
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"
