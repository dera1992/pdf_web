from allauth.account.adapter import get_adapter
from allauth.account.models import EmailAddress
from allauth.account.utils import setup_user_email
from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from pdf_web.users.models import Profile
from pdf_web.users.models import User


class UserSerializer(serializers.HyperlinkedModelSerializer[User]):
    class Meta:
        model = User
        fields = ["id", "email", "name", "url"]
        extra_kwargs = {
            "url": {"view_name": "api:user-detail", "lookup_field": "pk"},
        }


class UserDetailsSerializer(serializers.ModelSerializer[User]):
    class Meta:
        model = User
        fields = ["id", "email", "name"]
        read_only_fields = ["id", "email", "name"]


class ProfileSerializer(serializers.ModelSerializer[Profile]):
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Profile
        fields = [
            "email",
            "full_name",
            "phone_number",
            "avatar",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["email", "created_at", "updated_at"]


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password1 = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)

    def validate_email(self, value: str) -> str:
        value = get_adapter().clean_email(value)
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return value

    def validate(self, attrs: dict[str, str]) -> dict[str, str]:
        if attrs["password1"] != attrs["password2"]:
            raise serializers.ValidationError({"password2": "Passwords do not match."})
        validate_password(attrs["password1"], user=User(email=attrs["email"]))
        return attrs

    def save(self, request):
        adapter = get_adapter()
        user = adapter.new_user(request)
        user.email = self.validated_data["email"]
        user.set_password(self.validated_data["password1"])
        user.save()
        setup_user_email(request, user, [])
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs: dict[str, str]) -> dict[str, str]:
        request = self.context.get("request")
        user = authenticate(request, email=attrs["email"], password=attrs["password"])
        if user is None:
            raise serializers.ValidationError("Unable to log in with provided credentials.")
        if not user.is_active:
            raise serializers.ValidationError("This account is inactive.")
        if settings.REQUIRE_EMAIL_VERIFICATION and not EmailAddress.objects.filter(
            user=user, verified=True
        ).exists():
            raise serializers.ValidationError("Email address has not been verified.")
        attrs["user"] = user
        return attrs


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class AccountActionSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True)
