# Focal Person Forgot Password Implementation

## Overview

This implementation provides a complete Forgot Password / Reset Password feature for Focal users, following the same patterns and UI/UX as the existing Admin/Dispatcher forgot password flow. The feature allows focal users to reset their passwords by receiving a verification code via email.

## Features

- **Email Verification**: Users receive a 6-digit verification code via email
- **Password Policy Enforcement**: Strong password requirements with real-time validation
- **Session Management**: Secure session handling with expiry timers
- **Error Handling**: Comprehensive error messages and user feedback
- **Responsive Design**: Mobile-friendly UI matching the focal person design system
- **Accessibility**: Proper form labels, keyboard navigation, and screen reader support

## File Structure

```
frontend/src/pages/Focal/LoginFocal/
├── api/
│   ├── authApi.ts              # API functions for password reset
│   ├── types.ts                # TypeScript interfaces
│   └── index.ts                # API exports
├── components/
│   └── forgotPassword/
│       ├── FindAccount.tsx             # Step 1: Find user account
│       ├── VerifyCode.tsx              # Step 2: Verify reset code
│       ├── ResetPassword.tsx           # Step 3: Set new password
│       ├── PasswordUpdated.tsx         # Step 4: Success confirmation
│       ├── FocalForgotPasswordAlerts.tsx # Toast notifications
│       └── index.ts                    # Component exports
├── FocalForgotPasswordFlow.tsx         # Main flow component
└── FocalForgotPasswordVerification.tsx # Verification-only flow
```

## API Endpoints

The frontend connects to the following backend endpoints:

- `POST /focal/reset` - Request password reset code
- `POST /verifyResetCode` - Verify the reset code
- `POST /resetPassword` - Update the password

## Usage Flow

### 1. Find Account (Step 1)
- User enters email or phone number
- System validates account exists
- Sends 6-digit verification code to email
- Redirects to verification step

### 2. Verify Code (Step 2)
- User enters 6-digit verification code
- Real-time countdown timer (5 minutes)
- Resend functionality available
- Code validation with backend

### 3. Reset Password (Step 3)
- User creates new password
- Real-time password policy validation
- Password confirmation matching
- Secure password update

### 4. Success Confirmation (Step 4)
- Success message display
- Redirect to login option

## Routes

- `/forgot-password-focal` - Main forgot password flow
- `/forgot-password-verification-focal` - Direct verification entry point

## Security Features

- **Code Expiry**: Verification codes expire after 5 minutes
- **Session Storage**: Temporary data stored securely
- **Rate Limiting**: Backend prevents brute force attacks
- **Password Policy**: Enforces strong password requirements:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character

## Components Details

### FocalForgotPasswordFlow
Main orchestrator component that manages the 4-step flow with animations and state management.

### API Functions
- `requestFocalPasswordReset()` - Initiates reset process
- `verifyFocalResetCode()` - Validates verification code
- `resetFocalPassword()` - Updates user password

### Alert System
Toast notifications for:
- Code sent confirmation
- Code verification success
- Code resent notification
- Password updated success
- Error messages

## Integration

The forgot password feature is integrated into the focal login page via a "Forgot Password?" link that navigates to `/forgot-password-focal`.

## Error Handling

Comprehensive error handling for:
- Network connection issues
- Invalid credentials
- Expired codes
- Server errors
- Validation failures

## Responsive Design

The implementation includes responsive breakpoints:
- Desktop: Full-size components with proper spacing
- Mobile: Optimized layouts with smaller fonts and condensed spacing
- Uses Tailwind CSS responsive utilities (`sm:` prefix for mobile)

## Testing

To test the implementation:
1. Navigate to the focal login page
2. Click "Forgot Password?"
3. Enter a valid email/phone number
4. Check email for verification code
5. Complete the password reset flow

## Future Enhancements

Potential improvements:
- SMS verification option
- Password strength meter
- Account lockout after multiple failed attempts
- Remember device functionality
- Two-factor authentication integration