# JWT Token Authentication System

## Overview

The application now uses JWT (JSON Web Token) based authentication to secure all API endpoints. Users must be authenticated to make any requests to protected endpoints.

## Security Architecture

### Token Flow

1. **User Registration/Login**
   - User authenticates with Firebase (Google, Email, etc.)
   - Server receives user info and creates/syncs user in database
   - Server generates JWT token signed with secret key
   - Token is returned to client and stored in localStorage
   - Token expires after 7 days

2. **Making API Requests**
   - Client includes JWT token in `Authorization` header
   - Format: `Authorization: Bearer <token>`
   - Server validates token on every protected endpoint
   - If valid: Request proceeds
   - If invalid/missing: Returns 401/403 error

3. **Token Validation**
   - Server verifies token signature using JWT_SECRET
   - Checks token expiration
   - Extracts userId from token payload
   - Validates userId matches the requested resource

## Implementation Details

### Server Side (server.js)

#### JWT Configuration
```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_in_production';

// Token generation
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};
```

#### Authentication Middleware
```javascript
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.userId = decoded.userId;
    next();
  });
};
```

#### Protected Endpoints

All API endpoints now require authentication:

- `GET /api/users/:userId/credits` - Get credit balance
- `POST /api/users/:userId/credits/deduct` - Deduct credits
- `POST /api/users/:userId/credits/add` - Add credits
- `POST /api/detect-accessory-type` - Detect accessory type
- `POST /api/validate-image-suitability` - Validate image
- `POST /api/generate-try-on-image` - Generate try-on image

**Unprotected Endpoints:**
- `POST /api/users/register` - Register/login (issues token)
- `GET /api/health` - Health check

#### User Authorization Check
```javascript
// Example: Credits endpoint
app.get('/api/users/:userId/credits', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  
  // Verify the userId matches the authenticated user
  if (userId !== req.userId) {
    return res.status(403).json({ error: 'Unauthorized access to user data' });
  }
  
  // ... proceed with request
});
```

### Client Side

#### Token Storage (authService.ts)

```typescript
// Token management functions
const getAuthToken = (): string | null => {
  return localStorage.getItem('jwt_token');
};

const setAuthToken = (token: string): void => {
  localStorage.setItem('jwt_token', token);
};

const removeAuthToken = (): void => {
  localStorage.removeItem('jwt_token');
};

// Export for use in other services
export const authToken = {
  get: getAuthToken,
  set: setAuthToken,
  remove: removeAuthToken
};
```

#### Token Reception on Login

```typescript
const convertFirebaseUserToAppUser = async (firebaseUser, provider) => {
  const response = await fetch(`${API_URL}/api/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: firebaseUser.uid,
      email: firebaseUser.email,
      name: firebaseUser.displayName,
      provider: provider
    })
  });

  const userData = await response.json();
  
  // Store JWT token
  if (userData.token) {
    setAuthToken(userData.token);
  }
  
  return userData;
};
```

#### Token Removal on Logout

```typescript
logout: async () => {
  await signOut(authInstance);
  removeAuthToken(); // Clear JWT token
}
```

#### Sending Tokens with Requests (geminiService.ts, storageService.ts)

```typescript
import { authToken } from './authService';

const callServerAPI = async (endpoint, payload) => {
  const token = authToken.get();
  
  if (!token) {
    throw new Error('Authentication required. Please log in.');
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error('Authentication failed. Please log in again.');
  }
  
  // ... handle response
};
```

## Environment Configuration

### Required Environment Variable

Add to `.env` file:
```
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
```

**Important:**
- Use a strong, random secret key in production
- Never commit the actual secret to version control
- Keep different secrets for development and production
- Minimum 32 characters recommended

### Generating a Secure Secret

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Using OpenSSL
openssl rand -hex 64
```

## Token Payload Structure

```json
{
  "userId": "firebase-user-id-here",
  "iat": 1705441234,  // Issued at timestamp
  "exp": 1706046034   // Expiration timestamp (7 days later)
}
```

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Access token required"
}
```
**Cause:** No token provided in Authorization header
**Action:** User needs to log in

### 403 Forbidden
```json
{
  "error": "Invalid or expired token"
}
```
**Cause:** Token is malformed, expired, or has invalid signature
**Action:** User needs to log in again

```json
{
  "error": "Unauthorized access to user data"
}
```
**Cause:** User trying to access another user's data
**Action:** Request denied, possible security issue

## Security Best Practices

### Server Side

1. **Secret Key Management**
   - Store JWT_SECRET in environment variables
   - Use different secrets for different environments
   - Rotate secrets periodically
   - Never expose secrets in logs or error messages

2. **Token Expiration**
   - Tokens expire after 7 days
   - Implement refresh token flow for better UX (future enhancement)
   - Force re-authentication after expiration

3. **HTTPS Only**
   - Always use HTTPS in production
   - Tokens transmitted over HTTP can be intercepted

4. **Rate Limiting**
   - Implement rate limiting on authentication endpoints
   - Prevent brute force attacks

### Client Side

1. **Token Storage**
   - Currently using localStorage (acceptable for this use case)
   - Alternative: httpOnly cookies (more secure but requires server-side session)

2. **Token Cleanup**
   - Always remove token on logout
   - Clear token if 401/403 received
   - Don't store tokens in URL parameters or query strings

3. **Error Handling**
   - Catch authentication errors gracefully
   - Redirect to login on auth failure
   - Show user-friendly messages

## Testing Authentication

### Test Token Generation

```bash
# Using curl to register/login
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "email": "test@example.com",
    "name": "Test User",
    "provider": "google"
  }'

# Response includes token
{
  "id": "test-user-123",
  "email": "test@example.com",
  "name": "Test User",
  "provider": "google",
  "credits": 5,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Test Protected Endpoint

```bash
# Without token (should fail)
curl -X GET http://localhost:3001/api/users/test-user-123/credits

# Response: 401
{
  "error": "Access token required"
}

# With token (should succeed)
curl -X GET http://localhost:3001/api/users/test-user-123/credits \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Response: 200
{
  "credits": 5
}
```

### Test Invalid Token

```bash
curl -X GET http://localhost:3001/api/users/test-user-123/credits \
  -H "Authorization: Bearer invalid_token_here"

# Response: 403
{
  "error": "Invalid or expired token"
}
```

## Migration Notes

### From Previous Version

If upgrading from a version without JWT authentication:

1. **Existing Users**
   - Users will need to log in again after upgrade
   - Old localStorage data remains but lacks JWT token
   - First login after upgrade will generate new token

2. **Database**
   - No database migration needed
   - User records remain unchanged
   - JWT tokens are not stored in database

3. **Client Code**
   - All API calls now require authentication
   - Unauthenticated requests will fail with 401
   - Error handling updated to catch auth errors

## Troubleshooting

### "Access token required" Error

**Problem:** API returns 401 with "Access token required"

**Solutions:**
1. Check if user is logged in
2. Verify token exists in localStorage: `localStorage.getItem('jwt_token')`
3. Check if token is being sent in Authorization header
4. Re-login to get new token

### "Invalid or expired token" Error

**Problem:** API returns 403 with "Invalid or expired token"

**Solutions:**
1. Token may have expired (7 day lifetime)
2. JWT_SECRET may have changed on server
3. Token may be corrupted in localStorage
4. User needs to log in again

### "Unauthorized access to user data" Error

**Problem:** API returns 403 when accessing user resources

**Solutions:**
1. userId in URL doesn't match authenticated user
2. Possible security issue - user trying to access another user's data
3. Check if correct userId is being used in API calls

### Server Won't Start

**Problem:** Server fails to start or crashes

**Solutions:**
1. Ensure `jsonwebtoken` package is installed: `npm install jsonwebtoken`
2. Check if JWT_SECRET is set (will use default if not)
3. Review server logs for specific errors

## Future Enhancements

1. **Refresh Tokens**
   - Implement refresh token flow
   - Longer-lived refresh tokens (30 days)
   - Short-lived access tokens (15 minutes)

2. **Token Revocation**
   - Maintain blacklist of revoked tokens
   - Allow admin to revoke tokens
   - Handle compromised tokens

3. **Role-Based Access Control**
   - Add user roles (admin, user, etc.)
   - Implement permission checks
   - Fine-grained access control

4. **Multi-Factor Authentication**
   - Add 2FA support
   - SMS/Email verification
   - Authenticator app support

5. **Session Management**
   - Track active sessions
   - Allow users to view/revoke sessions
   - Device tracking

## API Reference

### Register/Login User
**Endpoint:** `POST /api/users/register`

**Request:**
```json
{
  "userId": "firebase-user-id",
  "email": "user@example.com",
  "name": "John Doe",
  "provider": "google"
}
```

**Response:**
```json
{
  "id": "firebase-user-id",
  "email": "user@example.com",
  "name": "John Doe",
  "provider": "google",
  "credits": 5,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Note:** This is the only endpoint that returns a token. All other endpoints require this token in the Authorization header.
