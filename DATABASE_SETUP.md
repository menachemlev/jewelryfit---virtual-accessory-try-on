# Database Setup - SQLite Credit System

## Overview

User credits are now stored in an SQLite database instead of localStorage. This provides better security, data persistence, and allows for server-side credit management.

## Architecture

### Database Schema

The system uses a `users` table with the following structure:

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,           -- Firebase user ID
  email TEXT UNIQUE,             -- User email
  name TEXT,                     -- User display name
  provider TEXT,                 -- Auth provider (google, email, etc.)
  credits INTEGER DEFAULT 5,     -- Credit balance (starts at 5)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Components

1. **database.js** - Database service layer
   - Handles all SQLite operations
   - Creates database and tables automatically
   - Provides methods for credit management

2. **Server API Endpoints** (server.js)
   - `POST /api/users/register` - Register/sync user with database
   - `GET /api/users/:userId/credits` - Get current credit balance
   - `POST /api/users/:userId/credits/deduct` - Deduct credits
   - `POST /api/users/:userId/credits/add` - Add credits

3. **Client Services**
   - **authService.ts** - Syncs user with database on login
   - **storageService.ts** - Makes API calls for credit operations

## How It Works

### User Registration/Login Flow

1. User authenticates with Firebase (Google, Email, etc.)
2. Firebase returns user ID and profile info
3. Client calls `POST /api/users/register` with user details
4. Server checks if user exists in database:
   - If new user: Creates record with 5 initial credits
   - If existing user: Returns current credit balance
5. Client updates local state with credits from database

### Credit Operations

#### Deducting Credits
```typescript
// Client side (App.tsx or component)
const success = await storageService.deductCredit(1);
if (!success) {
  // Insufficient credits - show payment modal
}
```

#### Adding Credits
```typescript
// After successful payment
await storageService.addCredits(amount);
const updatedUser = storageService.getUser();
setUser(updatedUser);
```

#### Fetching Credits
```typescript
// Sync credits from database
const credits = await storageService.fetchCredits();
```

## Database File

- **Location**: `jewelryfit.db` in project root
- **Automatic Creation**: Created automatically on first server start
- **Git Ignored**: Database files are excluded from version control

## Development Setup

1. Install dependencies (includes better-sqlite3):
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm run server
   ```

3. The database will be created automatically at `jewelryfit.db`

4. Start the client in another terminal:
   ```bash
   npm run dev
   ```

## API Usage Examples

### Register/Sync User
```javascript
POST http://localhost:3001/api/users/register
Content-Type: application/json

{
  "userId": "firebase-user-id",
  "email": "user@example.com",
  "name": "John Doe",
  "provider": "google"
}

Response:
{
  "id": "firebase-user-id",
  "email": "user@example.com",
  "name": "John Doe",
  "provider": "google",
  "credits": 5
}
```

### Get Credits
```javascript
GET http://localhost:3001/api/users/firebase-user-id/credits

Response:
{
  "credits": 5
}
```

### Deduct Credits
```javascript
POST http://localhost:3001/api/users/firebase-user-id/credits/deduct
Content-Type: application/json

{
  "amount": 1
}

Response (Success):
{
  "success": true,
  "credits": 4
}

Response (Insufficient):
HTTP 402 Payment Required
{
  "error": "Insufficient credits"
}
```

### Add Credits
```javascript
POST http://localhost:3001/api/users/firebase-user-id/credits/add
Content-Type: application/json

{
  "amount": 10
}

Response:
{
  "success": true,
  "credits": 14
}
```

## Migration from localStorage

The system automatically handles the transition:

1. On login, user is registered/synced with database
2. If it's their first login after migration, they get 5 initial credits
3. Credits are no longer stored in localStorage (except as cache)
4. All credit operations go through the database API

## Security Considerations

1. **User ID Validation**: All API endpoints require a valid user ID
2. **No Client-Side Manipulation**: Credits can only be modified through server API
3. **Insufficient Funds Check**: Server validates credit balance before deductions
4. **Database is Server-Side Only**: Client cannot directly access database

## Backup and Persistence

The SQLite database file (`jewelryfit.db`) contains all user credit data. To backup:

```bash
# Copy the database file
cp jewelryfit.db jewelryfit.backup.db

# Or use SQLite backup command
sqlite3 jewelryfit.db ".backup jewelryfit.backup.db"
```

## Deployment Notes

For production deployment (e.g., Vercel):

1. Consider using a hosted database (PostgreSQL, MySQL, etc.)
2. Update `database.js` to use appropriate database adapter
3. Set `VITE_API_URL` environment variable to production API URL
4. Ensure database connection string is in server environment variables

## Troubleshooting

### Database locked
If you get "database is locked" errors:
- Make sure only one server instance is running
- Close any SQLite browser tools that might have the DB open
- Delete `.db-wal` and `.db-shm` files and restart

### Credits not updating
- Check that server is running and accessible
- Verify `VITE_API_URL` is correctly set
- Check browser console for API errors
- Ensure user is logged in (has valid Firebase user ID)

### Reset database
To start fresh:
```bash
# Stop server
# Delete database file
rm jewelryfit.db
# Restart server - database will be recreated
```
