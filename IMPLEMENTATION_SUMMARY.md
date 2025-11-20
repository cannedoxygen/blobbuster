# Content Expiration & Storage Extension Implementation

## Summary
Implemented automated content expiration monitoring and storage extension functionality for Blockbuster platform.

## Date: 2025-11-19

---

## ✅ What Was Implemented

### 1. **Cron Job Scheduler** (`apps/backend/src/jobs/index.ts`)

**Daily Content Expiration Check (3:00 AM UTC)**
- Scheduled using `node-cron`
- Runs `expireContentJob()` daily at 3:00 AM UTC
- Checks all active content where `storage_expires_at <= now`
- Marks expired content as `status = 2` (Expired)
- Removes expired content from library view

**Weekly Revenue Distribution (Sundays 2:00 AM UTC)**
- Scheduled for automatic weekly payouts
- Uses Bull queue for job processing

### 2. **Bull Job Queues** (`apps/backend/src/jobs/index.ts`)

**Video Transcoding Queue**
- Queue name: `video-transcoding`
- 3 retry attempts with exponential backoff
- Auto-cleanup of completed jobs
- Error logging and monitoring

**Revenue Distribution Queue**
- Queue name: `revenue-distribution`
- 2 retry attempts with fixed delay
- Handles parallel creator payouts

**Graceful Shutdown**
- Added `shutdownJobs()` function
- Closes all queues on SIGTERM/SIGINT
- Clean server termination

### 3. **Extend Storage API Endpoint** (`apps/backend/src/routes/upload.routes.ts`)

**POST** `/api/upload/extend-storage/:contentId`

**Request Body:**
```json
{
  "epochs": 52,
  "paymentDigest": "0xabc123...",
  "paidAmount": "1.5"
}
```

**Features:**
- ✅ Verifies user authentication
- ✅ Verifies uploader status
- ✅ Verifies content ownership
- ✅ Verifies payment on Sui blockchain
- ✅ Prevents payment replay attacks
- ✅ Calculates new expiration (epochs × 14 days)
- ✅ Updates database (`storage_epochs`, `storage_expires_at`)
- ✅ Reactivates expired content (status 2 → 1)
- ✅ Comprehensive logging

**Response:**
```json
{
  "success": true,
  "message": "Storage extended successfully",
  "content": {
    "id": "...",
    "title": "...",
    "storage_epochs": 104,
    "storage_expires_at": "2026-12-31T00:00:00.000Z",
    "status": 1
  },
  "extensionDetails": {
    "additionalEpochs": 52,
    "daysAdded": 728,
    "newExpirationDate": "2026-12-31T00:00:00.000Z",
    "amountPaidSUI": 1.5
  }
}
```

### 4. **Frontend Uploader Dashboard** (`apps/frontend/app/uploader/page.tsx`)

**Enhanced Content Cards:**
- ✅ Expiration warning badges (color-coded)
  - **Red** (EXPIRED): 0 days left
  - **Red** (7d left): ≤ 7 days remaining
  - **Orange** (30d left): ≤ 30 days remaining
- ✅ Expiration date display in metadata
- ✅ Status indicator shows "Expired" for status=2

**Extend Storage Button:**
- Appears on content expiring within 30 days
- Click handler prepared (placeholder alert)
- Ready for payment modal integration

**UI Example:**
```
┌─────────────────────────────────────────────────┐
│ 🎬 The Matrix    [⚠️ 5d left]                   │
│ Sci-Fi Action Thriller                         │
│ Status: Active • Uploaded 1/15/2025            │
│ Expires 1/24/2025                              │
│                                                │
│                        1,234 streams           │
│                        [View →]                │
│                        [Extend Storage]        │
└─────────────────────────────────────────────────┘
```

---

## 🔧 Technical Details

### Cron Schedule Expressions
```javascript
'0 3 * * *'    // Daily at 3:00 AM UTC (content expiration)
'0 2 * * 0'    // Sundays at 2:00 AM UTC (revenue distribution)
```

### Database Schema
Already migrated (migration: `20251117151715_add_storage_expiration`):
- `storage_epochs` INTEGER
- `storage_expires_at` TIMESTAMP(3)
- Index on `storage_expires_at` for fast queries

### Content Status Codes
- `0` = Pending (awaiting approval)
- `1` = Active (live in library)
- `2` = Expired (storage expired, hidden from library)

### Walrus Storage Calculation
- 1 epoch ≈ 14 days
- Standard upload: 52 epochs = ~728 days (~2 years)
- Extension example: 52 additional epochs = +728 days

---

## 📋 Next Steps / TODO

### High Priority
1. **Implement Extend Storage Modal** (Frontend)
   - Replace `alert()` with proper modal
   - Integrate Walrus pricing calculator
   - Sui wallet payment flow
   - Payment digest submission

2. **Test Cron Jobs**
   - Verify cron triggers at scheduled times
   - Monitor logs for execution
   - Test with expired test content

3. **Bull Queue Workers**
   - Implement transcoding queue processor
   - Implement revenue distribution processor
   - Add job progress tracking

### Medium Priority
4. **Email Notifications**
   - Notify creators 7 days before expiration
   - Notify creators 1 day before expiration
   - Confirmation email after extension

5. **Admin Dashboard**
   - View all expiring content
   - Manually extend storage (grace period)
   - Expiration analytics

6. **Monitoring & Alerts**
   - Set up cron job failure alerts
   - Track queue health metrics
   - Log aggregation (Datadog/Grafana)

### Low Priority
7. **Auto-renewal Option**
   - Allow creators to enable auto-extend
   - Store payment method for recurring charges
   - Configurable threshold (e.g., extend when <30 days)

8. **Bulk Extension**
   - Extend multiple content items at once
   - Discount for bulk extensions

---

## 🧪 Testing Checklist

### Backend
- [ ] Start server, verify cron jobs initialize
- [ ] Check logs for: "✓ Content expiration cron scheduled"
- [ ] Check logs for: "✓ Video transcoding queue initialized"
- [ ] Verify Redis connection for Bull queues
- [ ] Test `/api/upload/extend-storage/:contentId` endpoint
  - [ ] With valid payment
  - [ ] With invalid payment
  - [ ] With used payment digest (replay attack)
  - [ ] With non-existent content
  - [ ] With content owned by different user

### Frontend
- [ ] Upload content as creator
- [ ] Verify content cards show expiration date
- [ ] Test expiration warning badges
  - [ ] Create test content with near-expiration dates
  - [ ] Verify color coding (red/orange)
- [ ] Click "Extend Storage" button
- [ ] Verify button only shows for expiring content

### Cron Job
- [ ] Manually trigger: `expireContentJob()`
- [ ] Create test content with expired date
- [ ] Verify content status changes to 2
- [ ] Verify content disappears from library
- [ ] Wait for 3:00 AM UTC, check logs

---

## 📝 Code Locations

### Backend
- **Jobs:** `apps/backend/src/jobs/`
  - `index.ts` - Job initialization, cron scheduling
  - `expireContent.job.ts` - Content expiration logic
- **Routes:** `apps/backend/src/routes/upload.routes.ts`
  - Line 500-656: Extend storage endpoint
- **Server:** `apps/backend/src/index.ts`
  - Line 9: Import `shutdownJobs`
  - Line 60-76: Graceful shutdown handlers

### Frontend
- **Dashboard:** `apps/frontend/app/uploader/page.tsx`
  - Line 35-46: Content interface (added expiration fields)
  - Line 451-554: Content list with expiration UI

---

## 🐛 Known Issues

1. **TypeScript Build Errors** (Pre-existing)
   - `@types/jest` not installed
   - esModuleInterop issues
   - Does not affect runtime functionality

2. **Extend Storage Button**
   - Currently shows alert placeholder
   - Needs full payment modal implementation

3. **Bull Queue Workers**
   - Queue initialized but processors not implemented
   - Jobs will accumulate until workers added

---

## 🔍 Monitoring

### Logs to Watch
```bash
# Backend logs
tail -f apps/backend/logs/combined.log

# Look for:
✓ Content expiration cron scheduled (daily at 3:00 AM UTC)
✓ Revenue distribution cron scheduled (Sundays at 2:00 AM UTC)
✓ Video transcoding queue initialized
✓ Revenue distribution queue initialized
Running scheduled content expiration job...
Found X expired content items
Successfully marked X content items as expired
```

### Redis Queue Inspection
```bash
# Monitor Bull queues
redis-cli
> KEYS bull:*
> LLEN bull:video-transcoding:waiting
> LLEN bull:revenue-distribution:completed
```

---

## 💰 Cost Implications

### Walrus Storage Extension Pricing
- Platform receives extension payment
- 1 epoch ≈ 14 days storage
- Pricing determined by Walrus protocol
- Example: 52 epochs might cost ~1-3 SUI

### Creator Economics
- Creators pay to keep content available
- Alternative: Let content expire, re-upload later
- Trade-off: Maintain view history vs. fresh start

---

## 🚀 Deployment Notes

### Environment Variables Required
```env
REDIS_URL=redis://localhost:6379  # For Bull queues
```

### Dependencies Installed
- `node-cron` v3.0.3
- `bull` v4.12.0
- `@types/node-cron` v3.0.11

### Server Restart Required
Yes - cron jobs initialize on server start

### Database Migration
Already applied: `20251117151715_add_storage_expiration`

---

## 📞 Support

For issues or questions:
1. Check server logs: `apps/backend/logs/combined.log`
2. Verify Redis is running: `redis-cli ping`
3. Check cron expression syntax: https://crontab.guru
4. Inspect Bull queue: https://github.com/OptimalBits/bull

---

**Implementation completed by:** Claude Code
**Review status:** ✅ Code written, ⏳ Awaiting testing
**Production ready:** 🟡 Needs payment modal integration
