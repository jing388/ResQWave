# Dispatcher/Admin Login API Integration

This folder contains the API integration for the dispatcher and admin login functionality.

## File Structure

```
api/
├── index.ts          # Main export file
├── types.ts          # TypeScript interfaces and types
├── authApi.ts        # HTTP request functions
└── README.md         # This documentation file
```

## Authentication Flow

### 1. Initial Login (`loginDispatcher`)

- **Endpoint**: `POST /login`
- **Purpose**: Validates credentials and sends verification code to email
- **Request**: `{ ID: string, password: string }`
- **Response**: `{ message: string, userId: string }`

### 2. Verification (`verifyLoginCode`)

- **Endpoint**: `POST /verify-login`
- **Purpose**: Verifies the email code and returns JWT token
- **Request**: `{ userId: string, verificationCode: string }`
- **Response**: `{ message: string, token: string, user: {...} }`

## Usage

### In Components:

```tsx
import { useAuth } from "@/contexts/AuthContext";

// Login (Step 1)
const { login } = useAuth();
await login(ID, password); // Sends verification code to email

// Verification (Step 2)
const { verifyLogin } = useAuth();
await verifyLogin(code); // Completes authentication
```

### Direct API Usage:

```tsx
import { loginDispatcher, verifyLoginCode } from "./api";

// Step 1
const response1 = await loginDispatcher({ ID, password });

// Step 2
const response2 = await verifyLoginCode({
  userId: response1.userId,
  verificationCode: code,
});
```

## Error Handling

All API functions throw `ApiException` objects that contain:

- `message`: Error description
- `status`: HTTP status code (if available)

## Token Management

- JWT tokens are automatically stored in `localStorage` as `resqwave_token`
- User data is stored in `localStorage` as `resqwave_user`
- Temporary userId is stored in `sessionStorage` during verification flow

## Backend Requirements

The backend should implement these endpoints:

1. `POST /login` - Initial authentication
2. `POST /verify-login` - Code verification
3. `GET /me` (optional) - Get current user info

Make sure CORS is configured for `http://localhost:5173` and credentials are enabled.
