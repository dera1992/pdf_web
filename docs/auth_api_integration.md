# Auth & Profile API Integration Notes (React)

Base URL: `https://<your-domain>/api/`

## Authentication

### Register
`POST /api/auth/register/`

Request:
```json
{
  "email": "user@example.com",
  "password1": "StrongPass123!",
  "password2": "StrongPass123!"
}
```

Response (201):
```json
{
  "detail": "Verification e-mail sent."
}
```

Notes:
- Email verification is mandatory. Users cannot log in until verified.

### Login
`POST /api/auth/login/`

Request:
```json
{
  "email": "user@example.com",
  "password": "StrongPass123!"
}
```

Response (200):
```json
{
  "access": "<jwt_access_token>",
  "refresh": "<jwt_refresh_token>",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

Errors:
```json
{
  "non_field_errors": ["Email address has not been verified."]
}
```

### Logout
`POST /api/auth/logout/`

Request:
```json
{
  "refresh": "<jwt_refresh_token>"
}
```

Response (200):
```json
{
  "detail": "Successfully logged out."
}
```

### Refresh Token
`POST /api/auth/token/refresh/`

Request:
```json
{
  "refresh": "<jwt_refresh_token>"
}
```

Response (200):
```json
{
  "access": "<jwt_access_token>"
}
```

### Forgot Password
`POST /api/auth/password/forgot/`

Request:
```json
{
  "email": "user@example.com"
}
```

Response (200):
```json
{
  "detail": "Password reset e-mail has been sent."
}
```

> The endpoint always returns 200 to avoid leaking account existence.

### Reset Password Confirm
`POST /api/auth/password/reset/confirm/`

Request:
```json
{
  "uid": "<uid>",
  "token": "<token>",
  "new_password1": "NewStrongPass123!",
  "new_password2": "NewStrongPass123!"
}
```

Response (200):
```json
{
  "detail": "Password has been reset with the new password."
}
```

### Change Password
`POST /api/auth/password/change/`

Request:
```json
{
  "old_password": "OldStrongPass123!",
  "new_password1": "NewStrongPass123!",
  "new_password2": "NewStrongPass123!"
}
```

Response (200):
```json
{
  "detail": "New password has been saved."
}
```

## Profile

### Get Profile
`GET /api/profile/`

Response (200):
```json
{
  "email": "user@example.com",
  "full_name": "Ada Lovelace",
  "phone_number": "+14155551234",
  "avatar": "https://<your-domain>/media/avatars/avatar.png",
  "created_at": "2024-10-28T10:12:22Z",
  "updated_at": "2024-10-28T10:40:12Z"
}
```

### Update Profile (JSON)
`PATCH /api/profile/`

Request:
```json
{
  "full_name": "Ada Lovelace",
  "phone_number": "+14155551234"
}
```

### Update Profile (Multipart + Avatar Upload)
`PATCH /api/profile/` (Content-Type: `multipart/form-data`)

Form fields:
```
full_name: Ada Lovelace
phone_number: +14155551234
avatar: <binary file>
```

Example (fetch):
```js
const formData = new FormData();
formData.append("full_name", "Ada Lovelace");
formData.append("phone_number", "+14155551234");
formData.append("avatar", fileInput.files[0]);

await fetch("/api/profile/", {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
  body: formData,
});
```

## Account Lifecycle

### Deactivate Account
`POST /api/account/deactivate/`

Request:
```json
{
  "password": "StrongPass123!"
}
```

Response (200):
```json
{
  "detail": "Account deactivated."
}
```

### Delete Account
`DELETE /api/account/delete/`

Request:
```json
{
  "password": "StrongPass123!"
}
```

Response (204): no content.

## Social Auth (Google)

### Social Login
`POST /api/auth/social/google/`

Request (access token):
```json
{
  "access_token": "<google_access_token>"
}
```

Response (200):
```json
{
  "access": "<jwt_access_token>",
  "refresh": "<jwt_refresh_token>"
}
```

### Social Login (Facebook)
`POST /api/auth/social/facebook/`

Request (access token):
```json
{
  "access_token": "<facebook_access_token>"
}
```

Response (200):
```json
{
  "access": "<jwt_access_token>",
  "refresh": "<jwt_refresh_token>"
}
```

## JWT Storage Best Practices

- **Preferred:** Store JWTs in httpOnly, secure cookies to reduce XSS exposure.
- **If using JS storage:** keep access tokens in memory and use refresh tokens sparingly.
- Always rotate refresh tokens and handle 401 responses by refreshing tokens.
