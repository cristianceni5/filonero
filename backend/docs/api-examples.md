# API Examples - FiloNero MVP

Base URL: `https://filonero.cenidev.com/api`

## Auth

### POST `/api/auth/register`

Request:
```json
{
  "email": "mario@example.com",
  "password": "PasswordSicura123!",
  "nickname": "mario_rossi"
}
```

Response `201`:
```json
{
  "user": {
    "id": "f0ac605b-0dcb-4056-b5cd-14f507f9589e",
    "email": "mario@example.com",
    "nickname": "mario_rossi",
    "isEmailVerified": false,
    "status": "active",
    "createdAt": "2026-04-08T11:00:00.000Z",
    "updatedAt": "2026-04-08T11:00:00.000Z"
  },
  "session": {
    "accessToken": "jwt_access_token",
    "accessTokenExpiresAt": "2026-04-08T11:15:00.000Z",
    "refreshToken": "raw_refresh_token",
    "refreshTokenExpiresAt": "2026-05-08T11:00:00.000Z"
  }
}
```

### POST `/api/auth/login`

Request:
```json
{
  "email": "mario@example.com",
  "password": "PasswordSicura123!"
}
```

Response `200`:
```json
{
  "user": {
    "id": "f0ac605b-0dcb-4056-b5cd-14f507f9589e",
    "email": "mario@example.com",
    "nickname": "mario_rossi",
    "isEmailVerified": false,
    "status": "active",
    "createdAt": "2026-04-08T11:00:00.000Z",
    "updatedAt": "2026-04-08T11:00:00.000Z"
  },
  "session": {
    "accessToken": "jwt_access_token",
    "accessTokenExpiresAt": "2026-04-08T11:15:00.000Z",
    "refreshToken": "raw_refresh_token",
    "refreshTokenExpiresAt": "2026-05-08T11:00:00.000Z"
  }
}
```

### POST `/api/auth/magic-link/request`

Request:
```json
{
  "email": "mario@example.com"
}
```

Response `200` (sempre uniforme):
```json
{
  "message": "Se l'email e registrata, riceverai un link di accesso tra pochi istanti."
}
```

### POST `/api/auth/magic-link/verify`

Request:
```json
{
  "token": "magic_link_token"
}
```

Response `200`:
```json
{
  "user": {
    "id": "f0ac605b-0dcb-4056-b5cd-14f507f9589e",
    "email": "mario@example.com",
    "nickname": "mario_rossi",
    "isEmailVerified": true,
    "status": "active",
    "createdAt": "2026-04-08T11:00:00.000Z",
    "updatedAt": "2026-04-08T11:10:00.000Z"
  },
  "session": {
    "accessToken": "jwt_access_token",
    "accessTokenExpiresAt": "2026-04-08T11:25:00.000Z",
    "refreshToken": "raw_refresh_token",
    "refreshTokenExpiresAt": "2026-05-08T11:10:00.000Z"
  }
}
```

### POST `/api/auth/refresh`

Request:
```json
{
  "refreshToken": "raw_refresh_token"
}
```

Response `200`:
```json
{
  "user": {
    "id": "f0ac605b-0dcb-4056-b5cd-14f507f9589e",
    "email": "mario@example.com",
    "nickname": "mario_rossi",
    "isEmailVerified": true,
    "status": "active",
    "createdAt": "2026-04-08T11:00:00.000Z",
    "updatedAt": "2026-04-08T11:10:00.000Z"
  },
  "session": {
    "accessToken": "new_jwt_access_token",
    "accessTokenExpiresAt": "2026-04-08T11:40:00.000Z",
    "refreshToken": "new_raw_refresh_token",
    "refreshTokenExpiresAt": "2026-05-08T11:25:00.000Z"
  }
}
```

### POST `/api/auth/logout`

Request:
```json
{
  "refreshToken": "raw_refresh_token"
}
```

Response `200`:
```json
{
  "success": true
}
```

### GET `/api/auth/me`

Header:
- `Authorization: Bearer <accessToken>`

Response `200`:
```json
{
  "user": {
    "id": "f0ac605b-0dcb-4056-b5cd-14f507f9589e",
    "email": "mario@example.com",
    "nickname": "mario_rossi",
    "isEmailVerified": true,
    "status": "active",
    "createdAt": "2026-04-08T11:00:00.000Z",
    "updatedAt": "2026-04-08T11:10:00.000Z"
  }
}
```

## Users

### GET `/api/users/:id`

Response `200`:
```json
{
  "user": {
    "id": "c753433e-4e50-4307-a7ba-f84c1bcc93ee",
    "nickname": "laura",
    "status": "active",
    "createdAt": "2026-04-08T10:00:00.000Z"
  }
}
```

### PATCH `/api/users/me`

Request:
```json
{
  "nickname": "nuovo_nickname"
}
```

Response `200`:
```json
{
  "user": {
    "id": "f0ac605b-0dcb-4056-b5cd-14f507f9589e",
    "email": "mario@example.com",
    "nickname": "nuovo_nickname",
    "isEmailVerified": true,
    "status": "active",
    "createdAt": "2026-04-08T11:00:00.000Z",
    "updatedAt": "2026-04-08T11:30:00.000Z"
  }
}
```

### GET `/api/users/search?q=la`

Response `200`:
```json
{
  "users": [
    {
      "id": "c753433e-4e50-4307-a7ba-f84c1bcc93ee",
      "nickname": "laura",
      "status": "active"
    },
    {
      "id": "9dcafcb2-334a-4b15-ae9e-87abf937dc31",
      "nickname": "lallo",
      "status": "active"
    }
  ]
}
```

## Conversations

### GET `/api/conversations`

Response `200`:
```json
{
  "conversations": [
    {
      "id": "2f244947-ac35-47d3-b57e-114ea2d39028",
      "type": "direct",
      "createdAt": "2026-04-08T10:40:00.000Z",
      "members": [
        {
          "id": "f0ac605b-0dcb-4056-b5cd-14f507f9589e",
          "nickname": "mario_rossi",
          "status": "active"
        },
        {
          "id": "c753433e-4e50-4307-a7ba-f84c1bcc93ee",
          "nickname": "laura",
          "status": "active"
        }
      ],
      "lastMessage": {
        "id": "7f4f65ab-58be-440e-a2a5-a5860fba1a5e",
        "senderUserId": "c753433e-4e50-4307-a7ba-f84c1bcc93ee",
        "body": "Ci sentiamo dopo",
        "createdAt": "2026-04-08T11:05:00.000Z"
      }
    }
  ]
}
```

### POST `/api/conversations`

Request:
```json
{
  "otherUserId": "c753433e-4e50-4307-a7ba-f84c1bcc93ee"
}
```

Response `201`:
```json
{
  "conversation": {
    "id": "2f244947-ac35-47d3-b57e-114ea2d39028",
    "type": "direct",
    "createdAt": "2026-04-08T10:40:00.000Z",
    "members": [
      {
        "id": "f0ac605b-0dcb-4056-b5cd-14f507f9589e",
        "nickname": "mario_rossi",
        "status": "active"
      },
      {
        "id": "c753433e-4e50-4307-a7ba-f84c1bcc93ee",
        "nickname": "laura",
        "status": "active"
      }
    ],
    "lastMessage": null
  }
}
```

### GET `/api/conversations/:id`

Response `200`:
```json
{
  "conversation": {
    "id": "2f244947-ac35-47d3-b57e-114ea2d39028",
    "type": "direct",
    "createdAt": "2026-04-08T10:40:00.000Z",
    "members": [
      {
        "id": "f0ac605b-0dcb-4056-b5cd-14f507f9589e",
        "nickname": "mario_rossi",
        "status": "active"
      },
      {
        "id": "c753433e-4e50-4307-a7ba-f84c1bcc93ee",
        "nickname": "laura",
        "status": "active"
      }
    ],
    "lastMessage": {
      "id": "7f4f65ab-58be-440e-a2a5-a5860fba1a5e",
      "senderUserId": "c753433e-4e50-4307-a7ba-f84c1bcc93ee",
      "body": "Ci sentiamo dopo",
      "createdAt": "2026-04-08T11:05:00.000Z"
    }
  }
}
```

## Messages

### GET `/api/conversations/:id/messages?limit=30&before=2026-04-08T11:10:00.000Z`

Response `200`:
```json
{
  "messages": [
    {
      "id": "f168cc06-10f7-4a4f-8af7-6f5f59e7ff2f",
      "conversationId": "2f244947-ac35-47d3-b57e-114ea2d39028",
      "senderUserId": "f0ac605b-0dcb-4056-b5cd-14f507f9589e",
      "senderNickname": "mario_rossi",
      "body": "Ciao Laura",
      "createdAt": "2026-04-08T11:02:00.000Z",
      "editedAt": null
    },
    {
      "id": "7f4f65ab-58be-440e-a2a5-a5860fba1a5e",
      "conversationId": "2f244947-ac35-47d3-b57e-114ea2d39028",
      "senderUserId": "c753433e-4e50-4307-a7ba-f84c1bcc93ee",
      "senderNickname": "laura",
      "body": "Ci sentiamo dopo",
      "createdAt": "2026-04-08T11:05:00.000Z",
      "editedAt": null
    }
  ]
}
```

### POST `/api/conversations/:id/messages`

Request:
```json
{
  "body": "Ti va una call alle 18?"
}
```

Response `201`:
```json
{
  "message": {
    "id": "8e1591c7-87b5-4a98-aec1-cb2086ca6f31",
    "conversationId": "2f244947-ac35-47d3-b57e-114ea2d39028",
    "senderUserId": "f0ac605b-0dcb-4056-b5cd-14f507f9589e",
    "senderNickname": "mario_rossi",
    "body": "Ti va una call alle 18?",
    "createdAt": "2026-04-08T11:15:00.000Z",
    "editedAt": null
  }
}
```
