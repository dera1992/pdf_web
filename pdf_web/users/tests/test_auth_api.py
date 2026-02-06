import pytest
from allauth.account.models import EmailAddress
from rest_framework.test import APIClient

from pdf_web.users.models import Profile
from pdf_web.users.models import User
from pdf_web.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db


def test_register_creates_profile():
    client = APIClient()
    response = client.post(
        "/api/auth/register/",
        data={
            "email": "newuser@example.com",
            "password1": "StrongPass123!",
            "password2": "StrongPass123!",
        },
        format="json",
    )

    assert response.status_code == 201
    user = User.objects.get(email="newuser@example.com")
    assert Profile.objects.filter(user=user).exists()


def test_register_enforces_unique_email():
    UserFactory(email="unique@example.com")
    client = APIClient()
    response = client.post(
        "/api/auth/register/",
        data={
            "email": "unique@example.com",
            "password1": "StrongPass123!",
            "password2": "StrongPass123!",
        },
        format="json",
    )

    assert response.status_code == 400


def test_login_fails_if_email_not_verified():
    user = UserFactory(email="verifyme@example.com", password="StrongPass123!")
    EmailAddress.objects.create(user=user, email=user.email, verified=False, primary=True)
    client = APIClient()
    response = client.post(
        "/api/auth/login/",
        data={"email": user.email, "password": "StrongPass123!"},
        format="json",
    )

    assert response.status_code == 400


def test_password_forgot_returns_200_for_unknown_email():
    client = APIClient()
    response = client.post(
        "/api/auth/password/forgot/",
        data={"email": "missing@example.com"},
        format="json",
    )

    assert response.status_code == 200


def test_password_change_requires_auth():
    client = APIClient()
    response = client.post(
        "/api/auth/password/change/",
        data={
            "old_password": "OldPass123!",
            "new_password1": "NewPass123!",
            "new_password2": "NewPass123!",
        },
        format="json",
    )

    assert response.status_code == 401


def test_deactivate_sets_inactive():
    user = UserFactory(email="active@example.com", password="StrongPass123!")
    EmailAddress.objects.create(user=user, email=user.email, verified=True, primary=True)
    client = APIClient()
    login_response = client.post(
        "/api/auth/login/",
        data={"email": user.email, "password": "StrongPass123!"},
        format="json",
    )
    assert login_response.status_code == 200
    access = login_response.data["access"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
    response = client.post(
        "/api/account/deactivate/",
        data={"password": "StrongPass123!"},
        format="json",
    )

    assert response.status_code == 200
    user.refresh_from_db()
    assert user.is_active is False
