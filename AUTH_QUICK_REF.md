# Quick Authentication Reference

## New Login Screen Features

### Sign In Tab (Default)
- Email address field
- Password field
- "Sign In" button
- "Continue with Google" option

### Sign Up Tab
- Full name field
- Email address field
- Password field (6+ characters)
- Confirm password field
- "Create Account" button
- "Continue with Google" option

## User Stories

### Create Account
```
User Action → System Response
1. Click "Sign Up" → Registration form shown
2. Enter name → Name saved
3. Enter email → Email validated
4. Enter password → Password strength checked (6+ chars)
5. Confirm password → Passwords must match
6. Click "Create Account" → Account created, user logged in
```

### Login
```
User Action → System Response
1. Click "Sign In" → Login form shown
2. Enter email → Email field focused
3. Enter password → Password field masked
4. Click "Sign In" → User authenticated, logged in
```

### Errors Handled
- ✅ Email already registered
- ✅ Email not found
- ✅ Wrong password
- ✅ Invalid email format
- ✅ Password too short
- ✅ Passwords don't match
- ✅ Missing required fields

## Firebase Authentication Methods

### Email/Password
```typescript
// Register
await authService.registerWithEmail(email, password, displayName)

// Login
await authService.loginWithEmail(email, password)
```

### Google OAuth
```typescript
// Login
await authService.loginWithGoogle()
```

### Logout
```typescript
// Any method
await authService.logout()
```

## Provider Detection

The `User` object includes provider info:
```typescript
{
  id: "firebase-uid",
  name: "John Doe",
  email: "john@example.com",
  provider: "email" | "google"
}
```

## No Longer Supported

These were REMOVED:
- Facebook OAuth
- Apple OAuth
- Any social provider except Google

## Migration Path

If you want to add other providers later:
1. Enable in Firebase Console
2. Add import in authService.ts
3. Create new login method
4. Add UI button
5. Update types if needed
