# Neighborhood Assignment System - Code-Based Implementation

## Overview

This implementation replaces the SQL-based approach (`fix-n006.sql`) with application-level code for managing neighborhood-to-focal-person assignments. This prevents conflicts with deployed databases and provides better integration with the existing codebase.

## What Was Converted

### From SQL to Code

1. **Stored Procedure `RebalanceNeighborhoodAssignments`** → `NeighborhoodAssignmentService` class
2. **Trigger `BeforeNeighborhoodInsert`** → Auto-assignment logic in neighborhood creation
3. **Trigger `AfterFocalPersonArchive`** → Auto-reassignment logic in neighborhood archival

## Architecture

### 1. Service Layer (`src/services/neighborhoodAssignmentService.js`)

Core business logic for managing assignments:

**Key Methods:**
- `getLeastLoadedFocalPerson(excludeFocalPersonId)` - Finds focal person with fewest active assignments
- `autoAssignNeighborhood(neighborhoodId)` - Auto-assigns new neighborhood to least-loaded focal person
- `reassignNeighborhoodsFromFocalPerson(focalPersonId, dryRun)` - Reassigns neighborhoods when focal person is archived
- `rebalanceNeighborhoodAssignments(options)` - Rebalances all assignments, fixes unassigned/orphaned neighborhoods
- `getAssignmentDistribution()` - Returns current assignment statistics
- `validateAssignments()` - Checks for assignment issues

### 2. Controller Layer (`src/controllers/neighborhoodAssignmentController.js`)

API endpoint handlers for assignment management:

**Endpoints:**
- `GET /api/neighborhood-assignments/distribution` - View assignment distribution
- `GET /api/neighborhood-assignments/validate` - Validate assignments
- `POST /api/neighborhood-assignments/rebalance` - Manual rebalancing
- `POST /api/neighborhood-assignments/reassign-from-focal-person` - Reassign from specific focal person
- `POST /api/neighborhood-assignments/auto-assign` - Auto-assign specific neighborhood

### 3. Routes (`src/routes/neighborhoodAssignmentRoutes.js`)

Protected routes requiring admin/dispatcher role.

### 4. Integration Points

**Neighborhood Controller** (`src/controllers/neighborhoodController.js`):
- Modified `archivedNeighborhood` to auto-reassign neighborhoods when focal person is archived

**Focal Person Controller** (`src/controllers/focalPersonController.js`):
- Imported service for future auto-assignment on neighborhood creation

## Usage

### 1. Auto-Assignment on Neighborhood Creation

Neighborhoods are automatically assigned to the least-loaded focal person when created:

```javascript
// Automatically happens during createFocalPerson or when new neighborhoods are created
// No manual action needed - assignment service handles it
```

### 2. Auto-Reassignment on Focal Person Archive

When a focal person is archived, their neighborhoods are automatically reassigned:

```javascript
// Automatically happens in archivedNeighborhood endpoint
// DELETE /api/neighborhood/:id
```

### 3. Manual Rebalancing

**Dry Run (See what would change):**
```bash
POST /api/neighborhood-assignments/rebalance
Content-Type: application/json
Authorization: Bearer <admin_or_dispatcher_token>

{
  "dryRun": true
}
```

**Execute Rebalancing:**
```bash
POST /api/neighborhood-assignments/rebalance
Content-Type: application/json
Authorization: Bearer <admin_or_dispatcher_token>

{
  "dryRun": false
}
```

**Reassign from Specific Focal Person:**
```bash
POST /api/neighborhood-assignments/reassign-from-focal-person
Content-Type: application/json
Authorization: Bearer <admin_or_dispatcher_token>

{
  "focalPersonId": "FOCALP001",
  "dryRun": false
}
```

### 4. View Assignment Distribution

```bash
GET /api/neighborhood-assignments/distribution
Authorization: Bearer <admin_or_dispatcher_token>
```

Response:
```json
{
  "success": true,
  "distribution": [
    {
      "focalPersonId": "FOCALP001",
      "focalPersonName": "John Doe",
      "assignedNeighborhoods": 5,
      "email": "john@example.com",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

### 5. Validate Assignments

```bash
GET /api/neighborhood-assignments/validate
Authorization: Bearer <admin_or_dispatcher_token>
```

Response:
```json
{
  "success": true,
  "isValid": true,
  "unassignedCount": 0,
  "orphanedCount": 0,
  "orphanedNeighborhoodIds": [],
  "activeFocalPersonCount": 3,
  "message": "All neighborhoods are properly assigned"
}
```

## Dynamic Behavior

### Assignment Algorithm

1. **Least-Loaded Selection:**
   - Counts active (non-archived) neighborhoods per focal person
   - Selects focal person with lowest count
   - Tie-breaker: oldest `createdAt` timestamp

2. **Automatic Triggers:**
   - New neighborhood → Auto-assign to least-loaded focal person
   - Focal person archived → Reassign all their neighborhoods

3. **Manual Operations:**
   - Rebalance all → Fixes unassigned, orphaned, and imbalanced assignments
   - Reassign from specific FP → Moves all neighborhoods to least-loaded FP

## Safety Features

1. **Dry Run Mode:** Preview changes without committing
2. **Logging:** All operations logged via `addAdminLog`
3. **Error Handling:** Graceful failures with detailed error messages
4. **Validation:** Check assignment integrity anytime

## Migration from SQL

### What to Do

1. ✅ **DO NOT** run `fix-n006.sql` in production
2. ✅ **USE** the API endpoints for all assignment operations
3. ✅ **REMOVE** any cron jobs calling `CALL RebalanceNeighborhoodAssignments(...)`
4. ✅ **DROP** SQL procedures and triggers if already installed:
   ```sql
   DROP PROCEDURE IF EXISTS RebalanceNeighborhoodAssignments;
   DROP TRIGGER IF EXISTS AfterFocalPersonArchive;
   DROP TRIGGER IF EXISTS BeforeNeighborhoodInsert;
   ```

### Periodic Maintenance (Optional)

Set up a scheduled job using Node.js instead of SQL cron:

**Option 1: node-cron**
```javascript
// In src/index.js or separate scheduler file
const cron = require('node-cron');
const neighborhoodAssignmentService = require('./services/neighborhoodAssignmentService');

// Run rebalancing daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  try {
    console.log('Running scheduled neighborhood rebalancing...');
    const result = await neighborhoodAssignmentService.rebalanceNeighborhoodAssignments({
      dryRun: false
    });
    console.log('Rebalancing completed:', result);
  } catch (error) {
    console.error('Scheduled rebalancing failed:', error);
  }
});
```

**Option 2: Manual via API**
Call the rebalance endpoint from a scheduled task or admin dashboard.

## Testing

### Test Scenarios

1. **Create New Neighborhood:**
   - Verify auto-assignment to least-loaded focal person

2. **Archive Focal Person:**
   - Verify neighborhoods are reassigned

3. **Manual Rebalance:**
   - Create imbalanced assignments manually
   - Run rebalance with `dryRun: true`
   - Verify preview shows correct changes
   - Run with `dryRun: false`
   - Verify assignments are balanced

4. **Validation:**
   - Manually set neighborhood `focalPersonID` to null
   - Run validate endpoint
   - Verify it detects unassigned neighborhood

## Troubleshooting

### Issue: Neighborhoods not auto-assigned

**Check:**
1. Service imported correctly in controllers
2. Database connection active
3. At least one active (non-archived) focal person exists

### Issue: Rebalancing fails

**Check:**
1. User has admin or dispatcher role
2. Database has active focal persons
3. Check server logs for detailed error messages

### Issue: Assignment distribution uneven

**Solution:**
Run manual rebalancing:
```bash
POST /api/neighborhood-assignments/rebalance
{ "dryRun": false }
```

## API Reference

### GET /api/neighborhood-assignments/distribution
**Auth:** Admin, Dispatcher  
**Response:** Assignment statistics per focal person

### GET /api/neighborhood-assignments/validate
**Auth:** Admin, Dispatcher  
**Response:** Validation result with issues found

### POST /api/neighborhood-assignments/rebalance
**Auth:** Admin, Dispatcher  
**Body:**
```json
{
  "focalPersonId": "FOCALP001",  // optional
  "dryRun": false                // default: false
}
```
**Response:** Rebalancing result with statistics

### POST /api/neighborhood-assignments/reassign-from-focal-person
**Auth:** Admin, Dispatcher  
**Body:**
```json
{
  "focalPersonId": "FOCALP001",  // required
  "dryRun": false                // default: false
}
```
**Response:** Reassignment result

### POST /api/neighborhood-assignments/auto-assign
**Auth:** Admin, Dispatcher  
**Body:**
```json
{
  "neighborhoodId": "N001"       // required
}
```
**Response:** Assignment result

## Files Created/Modified

### Created:
- `src/services/neighborhoodAssignmentService.js` - Core service
- `src/controllers/neighborhoodAssignmentController.js` - API endpoints
- `src/routes/neighborhoodAssignmentRoutes.js` - Route definitions
- `NEIGHBORHOOD_ASSIGNMENT_GUIDE.md` - This file

### Modified:
- `src/controllers/neighborhoodController.js` - Added auto-reassignment on archive
- `src/controllers/focalPersonController.js` - Imported service
- `src/index.js` - Registered new routes

## Benefits Over SQL Approach

1. ✅ **No Database Schema Changes** - Avoids conflicts with deployed databases
2. ✅ **Better Integration** - Uses existing logging, error handling, and auth
3. ✅ **Easier Testing** - Can mock services in unit tests
4. ✅ **Version Control** - Code changes tracked in git
5. ✅ **API Access** - Can trigger operations via HTTP
6. ✅ **Flexible** - Easy to extend with new features
7. ✅ **Observable** - Detailed logging and error messages
8. ✅ **Safe** - Dry-run mode for testing

## Next Steps

1. Test the implementation in development environment
2. Verify auto-assignment on new neighborhood creation
3. Test manual rebalancing with dry-run
4. Deploy to production
5. Optional: Set up scheduled rebalancing if needed
