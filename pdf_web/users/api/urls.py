from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from pdf_web.users.api.auth_views import GoogleSocialLoginAPIView
from pdf_web.users.api.auth_views import LoginAPIView
from pdf_web.users.api.auth_views import LogoutAPIView
from pdf_web.users.api.auth_views import PasswordChangeAPIView
from pdf_web.users.api.auth_views import PasswordForgotAPIView
from pdf_web.users.api.auth_views import PasswordResetConfirmAPIView
from pdf_web.users.api.auth_views import RegisterAPIView
from pdf_web.users.api.account_views import DeactivateAccountAPIView
from pdf_web.users.api.account_views import DeleteAccountAPIView
from pdf_web.users.api.profile_views import ProfileAPIView

urlpatterns = [
    path("auth/register/", RegisterAPIView.as_view(), name="auth-register"),
    path("auth/login/", LoginAPIView.as_view(), name="auth-login"),
    path("auth/logout/", LogoutAPIView.as_view(), name="auth-logout"),
    path(
        "auth/password/forgot/",
        PasswordForgotAPIView.as_view(),
        name="auth-password-forgot",
    ),
    path(
        "auth/password/reset/confirm/",
        PasswordResetConfirmAPIView.as_view(),
        name="auth-password-reset-confirm",
    ),
    path(
        "auth/password/change/",
        PasswordChangeAPIView.as_view(),
        name="auth-password-change",
    ),
    path("auth/social/google/", GoogleSocialLoginAPIView.as_view(), name="auth-social-google"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="auth-token-refresh"),
    path("profile/", ProfileAPIView.as_view(), name="profile"),
    path("account/deactivate/", DeactivateAccountAPIView.as_view(), name="account-deactivate"),
    path("account/delete/", DeleteAccountAPIView.as_view(), name="account-delete"),
]
