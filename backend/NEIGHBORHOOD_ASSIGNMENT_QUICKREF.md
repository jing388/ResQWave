# Neighborhood Assignment System - Quick Reference

## 🚀 Quick Start

### API Endpoints (All require Admin/Dispatcher auth)

```bash
BASE_URL=http://localhost:5000/api

# View current distribution
GET $BASE_URL/neighborhood-assignments/distribution

# Validate assignments
GET $BASE_URL/neighborhood-assignments/validate

# Rebalance (dry run first!)
POST $BASE_URL/neighborhood-assignments/rebalance
Body: { "dryRun": true }

# Rebalance (execute)
POST $BASE_URL/neighborhood-assignments/rebalance
Body: { "dryRun": false }

# Reassign from specific focal person
POST $BASE_URL/neighborhood-assignments/reassign-from-focal-person
Body: { "focalPersonId": "FOCALP001", "dryRun": false }

# Auto-assign specific neighborhood
POST $BASE_URL/neighborhood-assignments/auto-assign
Body: { "neighborhoodId": "N001" }
```

## 📁 Files Overview

| File | Purpose |
|------|---------|
| `src/services/neighborhoodAssignmentService.js` | Core business logic |
| `src/controllers/neighborhoodAssignmentController.js` | API endpoint handlers |
| `src/routes/neighborhoodAssignmentRoutes.js` | Route definitions |
| `src/examples/neighborhoodAssignmentExample.js` | Usage examples |
| `NEIGHBORHOOD_ASSIGNMENT_GUIDE.md` | Full documentation |

## 🔄 Automatic Behaviors

1. **New Neighborhood Created** → Auto-assigned to least-loaded focal person
2. **Focal Person Archived** → Their neighborhoods auto-reassigned

## 🧪 Testing Commands

```bash
# Run example script (read-only operations)
node src/examples/neighborhoodAssignmentExample.js

# Test API with curl (replace TOKEN with actual JWT)
TOKEN="your_admin_or_dispatcher_token"

# Get distribution
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/neighborhood-assignments/distribution

# Dry run rebalance
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}' \
  http://localhost:5000/api/neighborhood-assignments/rebalance
```

## ⚙️ Service Methods

```javascript
const neighborhoodAssignmentService = require('./services/neighborhoodAssignmentService');

// Get least loaded focal person
const fp = await neighborhoodAssignmentService.getLeastLoadedFocalPerson();

// Auto-assign neighborhood
const result = await neighborhoodAssignmentService.autoAssignNeighborhood('N001');

// Reassign from focal person
const result = await neighborhoodAssignmentService.reassignNeighborhoodsFromFocalPerson('FOCALP001', false);

// Rebalance all
const result = await neighborhoodAssignmentService.rebalanceNeighborhoodAssignments({ dryRun: false });

// Get distribution
const dist = await neighborhoodAssignmentService.getAssignmentDistribution();

// Validate
const validation = await neighborhoodAssignmentService.validateAssignments();
```

## 🛡️ Safety Checklist

- [ ] Always run with `dryRun: true` first
- [ ] Check validation before rebalancing
- [ ] Review distribution after operations
- [ ] Test in development before production
- [ ] Ensure at least one active focal person exists

## 🔧 Common Tasks

### Check if assignments are balanced
```bash
GET /api/neighborhood-assignments/distribution
```

### Fix unassigned neighborhoods
```bash
POST /api/neighborhood-assignments/rebalance
Body: { "dryRun": false }
```

### Preview what rebalancing would do
```bash
POST /api/neighborhood-assignments/rebalance
Body: { "dryRun": true }
```

### Move neighborhoods from archived focal person
```bash
POST /api/neighborhood-assignments/reassign-from-focal-person
Body: { "focalPersonId": "FOCALP999", "dryRun": false }
```

## 🔍 Troubleshooting

| Issue | Solution |
|-------|----------|
| No focal persons available | Create at least one active focal person |
| Unassigned neighborhoods | Run rebalance endpoint |
| Orphaned assignments | Run rebalance endpoint |
| Uneven distribution | Run rebalance endpoint |

## 📊 Response Examples

### Distribution Response
```json
{
  "success": true,
  "distribution": [
    {
      "focalPersonId": "FOCALP001",
      "focalPersonName": "John Doe",
      "assignedNeighborhoods": 5,
      "email": "john@example.com"
    }
  ]
}
```

### Validation Response
```json
{
  "success": true,
  "isValid": true,
  "unassignedCount": 0,
  "orphanedCount": 0,
  "message": "All neighborhoods are properly assigned"
}
```

### Rebalance Response
```json
{
  "success": true,
  "message": "Successfully rebalanced 3 neighborhood(s)",
  "totalReassigned": 3,
  "fixedUnassigned": 2,
  "fixedOrphaned": 1,
  "dryRun": false
}
```

## 🚨 Migration from SQL

If `fix-n006.sql` was already run, execute this cleanup:

```sql
DROP PROCEDURE IF EXISTS RebalanceNeighborhoodAssignments;
DROP TRIGGER IF EXISTS AfterFocalPersonArchive;
DROP TRIGGER IF EXISTS BeforeNeighborhoodInsert;
```

Then use the API endpoints going forward.

---

For full documentation, see [NEIGHBORHOOD_ASSIGNMENT_GUIDE.md](./NEIGHBORHOOD_ASSIGNMENT_GUIDE.md)
