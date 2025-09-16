# Vouch System Implementation

## Overview
The vouch system allows users to "vouch" for issues they care about, helping prioritize important community problems. Each user can vouch once per issue, and they can also remove their vouch if needed.

## Database Structure

### Vouches Table
```sql
CREATE TABLE vouches (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    issue_id BIGINT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure a user can only vouch once per issue
    CONSTRAINT unique_user_issue_vouch UNIQUE (user_id, issue_id)
);
```

### Key Features
- **Foreign Keys**: Links users and issues with proper referential integrity
- **Unique Constraint**: Prevents duplicate vouches from the same user for the same issue
- **Cascading Deletes**: If a user or issue is deleted, related vouches are automatically removed

## API Endpoints

### 1. POST /api/issues/{issue_id}/vouch
**Purpose**: Add or remove a vouch for an issue (toggle behavior)

**Authentication**: Required (JWT token)

**Behavior**:
- If user hasn't vouched: Adds a new vouch
- If user has already vouched: Removes the existing vouch

**Response**:
```json
{
  "message": "Issue vouched successfully" | "Vouch removed successfully",
  "issue_id": 123,
  "vouch_count": 5,
  "user_vouched": true | false,
  "source": "database"
}
```

### 2. GET /api/issues/{issue_id}/vouch
**Purpose**: Get vouch details for an issue

**Authentication**: Optional (more details if authenticated)

**Response**:
```json
{
  "issue_id": 123,
  "title": "Broken Street Light",
  "vouch_count": 5,
  "user_vouched": true,
  "vouchers": [
    {
      "vouched_at": "2025-09-16T10:30:00Z",
      "user": {
        "mobile_number": "9876543210",
        "civic_id": "CIV123456",
        "full_name": "John Doe"
      }
    }
  ],
  "source": "database"
}
```

### 3. GET /api/user/vouches
**Purpose**: Get all issues vouched by the current user

**Authentication**: Required

**Response**:
```json
{
  "vouched_issues": [
    {
      "id": 123,
      "title": "Broken Street Light",
      "description": "Street light not working",
      "category": "infrastructure",
      "priority": "high",
      "status": "Open",
      "created_at": "2025-09-15T08:00:00Z",
      "vouched_at": "2025-09-16T10:30:00Z"
    }
  ],
  "count": 1,
  "source": "database"
}
```

## Database Functions

### Add Vouch Function
```sql
SELECT add_vouch(user_id, issue_id);
```
Returns JSON with success/failure and duplicate prevention.

### Remove Vouch Function
```sql
SELECT remove_vouch(user_id, issue_id);
```
Returns JSON with success/failure status.

### Issue Vouch Counts View
```sql
SELECT * FROM issue_vouch_counts;
```
Provides a comprehensive view of all issues with their vouch counts and voucher details.

## Setup Instructions

### 1. Create the Vouch Table
Run the SQL in `create_vouch_table.sql` in your Supabase dashboard.

### 2. Update Your Flask Server
The Flask endpoints have been updated to use the new vouch system.

### 3. Frontend Integration
Update your frontend components to use the new API endpoints:

```javascript
// Vouch for an issue
const vouchResponse = await fetch(`/api/issues/${issueId}/vouch`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Get vouch details
const vouchDetails = await fetch(`/api/issues/${issueId}/vouch`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Get user's vouches
const userVouches = await fetch('/api/user/vouches', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## Benefits of This System

1. **Prevents Duplicate Vouches**: Each user can only vouch once per issue
2. **Toggle Functionality**: Users can remove their vouch if they change their mind
3. **Detailed Tracking**: Know exactly who vouched for what and when
4. **Scalable**: Proper database design with indexes for performance
5. **Secure**: Authentication required for vouching actions
6. **Analytics Ready**: Easy to query vouch patterns and user engagement

## Query Examples

See `vouch_queries.sql` for comprehensive examples of how to:
- Find top-voted issues
- Get user vouch history
- Analyze vouch patterns
- Find issues needing more attention