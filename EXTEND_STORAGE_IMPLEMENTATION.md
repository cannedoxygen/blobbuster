# Extend Storage Feature - Complete Implementation

## Date: 2025-11-19

---

## ✅ What Was Implemented

### 1. **Backend Infrastructure**

#### Cron Job & Queues (`apps/backend/src/jobs/index.ts`)
- ✅ **Daily expiration check** - Runs at 3:00 AM UTC
- ✅ **Bull job queues** - Video transcoding & revenue distribution
- ✅ **Graceful shutdown** - Closes queues on server termination

#### Extend Storage API (`apps/backend/src/routes/upload.routes.ts:500-656`)
**Endpoint:** `POST /api/upload/extend-storage/:contentId`

**Request Body:**
```json
{
  "epochs": 52,
  "paymentDigest": "0xabc123...",
  "paidAmount": "1.5"
}
```

**Features:**
- ✅ Verifies authentication & content ownership
- ✅ Verifies payment on Sui blockchain
- ✅ Prevents payment replay attacks (checks used digests)
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

### 2. **Frontend Components**

#### ExtendStorageModal Component (`apps/frontend/components/ExtendStorageModal.tsx`)

**Features:**
- ✅ Beautiful modal with Blockbuster 80s theme
- ✅ Shows current expiration status (days remaining, color-coded)
- ✅ Epoch slider (1-365 epochs) with number input
- ✅ Real-time cost calculation via `/api/walrus/estimate-cost`
- ✅ Detailed cost breakdown (Walrus network + Platform fee)
- ✅ New expiration date preview
- ✅ Sui wallet balance check
- ✅ Payment flow via `payForWalrusStorage()`
- ✅ Payment success confirmation
- ✅ Auto-extends storage after payment
- ✅ Error handling with user-friendly messages
- ✅ Loading states for all async operations

**Props:**
```typescript
{
  isOpen: boolean;
  onClose: () => void;
  content: {
    id: string;
    title: string;
    storage_epochs?: number;
    storage_expires_at?: string;
    posterUrl?: string;
    thumbnailUrl?: string;
  };
  onSuccess?: () => void;
}
```

#### Uploader Dashboard Integration (`apps/frontend/app/uploader/page.tsx`)

**Enhancements:**
- ✅ Added `storage_epochs` & `storage_expires_at` to Content interface
- ✅ Expiration warning badges (color-coded: red/orange)
- ✅ "Extend Storage" button appears when ≤30 days remaining
- ✅ Modal state management (open/close, selected content)
- ✅ Success callback refreshes content list
- ✅ Displays expiration date in content metadata
- ✅ Status shows "Expired" for status=2

**UI Example:**
```
┌───────────────────────────────────────────┐
│ 🎬 The Matrix  [⚠️ 5d left]               │
│ Sci-Fi Action Thriller                   │
│ Status: Active • Uploaded 1/15/2025      │
│ Expires 1/24/2025                        │
│                                          │
│                    1,234 streams         │
│                    [View →]              │
│                    [Extend Storage]      │
└───────────────────────────────────────────┘
```

---

## 🔧 Technical Implementation Details

### Payment Flow

1. **User clicks "Extend Storage"**
   - Opens modal with content details
   - Shows current expiration status

2. **User selects additional epochs**
   - Slider: 1-365 epochs
   - Real-time cost calculation
   - Calls: `POST /api/walrus/estimate-cost`
   - Uses 2GB estimated file size (ESTIMATED_FILE_SIZE_BYTES)

3. **Cost breakdown displayed**
   ```
   Walrus Network Cost:
   - Storage (52 epochs): 0.0234 WAL
   - Subtotal: 0.0234 WAL

   You Pay (in SUI):
   - Storage cost: 0.0702 SUI (3x markup)
   - Platform fee: 0.0006 SUI
   - Total Payment: 0.0708 SUI
   ```

4. **User clicks "Pay for Extension"**
   - Checks wallet balance
   - Creates Sui transaction (split coins, transfer to platform wallet)
   - Signs with connected wallet
   - Returns payment digest

5. **Auto-extend storage**
   - Calls: `POST /api/upload/extend-storage/:contentId`
   - Sends: `{ epochs, paymentDigest, paidAmount }`
   - Backend verifies payment on-chain
   - Backend extends expiration date
   - Frontend refreshes content list
   - Modal shows success & closes

### Database Updates

When storage is extended:
```sql
UPDATE content
SET
  storage_epochs = storage_epochs + 52,
  storage_expires_at = storage_expires_at + INTERVAL '728 days',
  status = 1,  -- Reactivate if expired
  updated_at = NOW()
WHERE id = :contentId
```

### Security Features

1. **Payment verification** - Backend queries Sui blockchain to verify transaction
2. **Ownership check** - Only content owner can extend
3. **Replay protection** - Payment digests can only be used once
4. **Amount validation** - Verifies user paid correct amount

---

## 📋 File Size Estimation

**Current Approach:**
- Uses fixed 2GB estimate: `ESTIMATED_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024`
- Reason: File size not stored in database
- Walrus encoding: ~4.5x original size (RedStuff encoding)

**Future Improvements:**
1. **Add `file_size_bytes` column to content table** (recommended)
2. **Query Walrus for blob size** (via Walrus API)
3. **Store during upload** - Modify upload service to save file size

**Migration to add file size:**
```sql
ALTER TABLE content ADD COLUMN file_size_bytes BIGINT;
CREATE INDEX content_file_size_idx ON content(file_size_bytes);
```

---

## 🧪 Testing Checklist

### Backend
- [ ] Start server, verify no errors in logs
- [ ] Test endpoint: `POST /api/upload/extend-storage/:contentId`
  - [ ] With valid payment
  - [ ] With invalid payment
  - [ ] With replay attack (reused digest)
  - [ ] With non-existent content
  - [ ] With different user's content
- [ ] Verify expiration date calculation (epochs × 14 days)
- [ ] Verify status change (2 → 1) for expired content

### Frontend
- [ ] Upload content as creator
- [ ] Wait for content to show expiring warning
  - Or manually set `storage_expires_at` in database to near-future date
- [ ] Click "Extend Storage" button
- [ ] Verify modal opens with correct content info
- [ ] Test epoch slider (1-365)
- [ ] Verify cost updates in real-time
- [ ] Test payment flow:
  - [ ] With connected wallet
  - [ ] With insufficient balance (error handling)
  - [ ] With successful payment
  - [ ] Verify payment confirmation shown
  - [ ] Verify auto-extend after payment
- [ ] Verify content list refreshes
- [ ] Verify expiration date updated
- [ ] Verify warning badge disappears if >30 days

### End-to-End
- [ ] Create test content with near-expiration date
- [ ] Complete full extend flow
- [ ] Verify blockchain transaction on Sui Explorer
- [ ] Verify database updated correctly
- [ ] Verify content remains active/visible

---

## 🐛 Known Issues & Limitations

1. **File Size Estimation**
   - Uses fixed 2GB estimate
   - May not reflect actual file size
   - Cost estimation may be slightly inaccurate
   - **Solution:** Add file_size_bytes to database schema

2. **No Bulk Extension**
   - Can only extend one content at a time
   - **Future:** Add bulk extend feature

3. **No Auto-Renewal**
   - Manual extension required
   - **Future:** Add opt-in auto-renewal

4. **Cost Includes 3x Markup**
   - Platform markup for WAL→SUI conversion
   - May need adjustment based on exchange rates

5. **No Email Notifications**
   - No reminders before expiration
   - **Future:** Send email 7 days before expiration

---

## 📝 Code Locations

### Backend
- **Jobs:** `apps/backend/src/jobs/index.ts` (cron scheduler)
- **Jobs:** `apps/backend/src/jobs/expireContent.job.ts` (expiration logic)
- **Routes:** `apps/backend/src/routes/upload.routes.ts:500-656` (extend endpoint)
- **Server:** `apps/backend/src/index.ts:60-76` (graceful shutdown)

### Frontend
- **Modal:** `apps/frontend/components/ExtendStorageModal.tsx` (new file)
- **Dashboard:** `apps/frontend/app/uploader/page.tsx` (integration)
- **Library:** `apps/frontend/app/library/page.tsx:135-153` (expiration badges)

---

## 🚀 Deployment Checklist

### Environment Variables
```env
# Backend
REDIS_URL=redis://localhost:6379
PLATFORM_WALLET=0x...

# Frontend
NEXT_PUBLIC_API_URL=https://api.blockbuster.app
NEXT_PUBLIC_PLATFORM_WALLET=0x...
```

### Server Restart
- ✅ Backend restart required (cron jobs initialize on start)
- ✅ Frontend rebuild required (new modal component)

### Database
- ✅ No migration needed (storage_expires_at already exists)
- 🔄 Optional: Add file_size_bytes column for accurate pricing

### Dependencies
- ✅ All dependencies already installed (node-cron, bull)

---

## 💰 Pricing Example

**Extending 2GB movie by 52 epochs (~1 year):**

```
Original file: 2 GB
Encoded size: ~9 GB (4.5x RedStuff)

Walrus Storage Cost:
- Storage (52 epochs): 0.0234 WAL
- Write fee: 0.000001 WAL
- Total: 0.0234 WAL

User Payment (3x markup):
- Storage: 0.0702 SUI
- Platform fee: 0.0006 SUI
- Total: 0.0708 SUI (~$0.05-0.10 depending on SUI price)
```

---

## 🎯 User Experience Flow

1. **Creator sees expiring content:**
   ```
   ⚠️ 5d left - "The Matrix"
   ```

2. **Clicks "Extend Storage":**
   - Modal opens with content poster
   - Shows current expiration: Jan 24, 2025
   - Shows days remaining: 5 days

3. **Selects extension duration:**
   - Moves slider to 52 epochs
   - Sees: "Add 52 epochs (728 days)"
   - New expiration shown: Dec 21, 2026

4. **Reviews cost:**
   - Total: 0.0708 SUI
   - Breakdown clearly displayed

5. **Pays with wallet:**
   - Connects Sui wallet
   - Signs transaction
   - ~2-3 second confirmation

6. **Success:**
   - ✅ Payment confirmed
   - Content automatically extended
   - Returns to dashboard
   - Warning badge gone
   - Expiration date updated

---

## 📞 Support & Troubleshooting

### Common Issues

**"Failed to calculate storage cost"**
- Check backend is running
- Verify `/api/walrus/estimate-cost` endpoint accessible
- Check Redis connection

**"Payment failed"**
- Verify wallet has sufficient balance
- Check SUI network connection
- Verify PLATFORM_WALLET address correct

**"Payment verification failed"**
- Check backend can query Sui blockchain
- Verify SUI_RPC_URL correct
- Check payment digest format

**Extension not appearing**
- Wait 5-10 seconds for blockchain confirmation
- Refresh content list manually
- Check browser console for errors

---

## 🔮 Future Enhancements

### High Priority
1. **Add file_size_bytes to database** - Accurate pricing
2. **Email notifications** - 7-day expiration reminders
3. **Bulk extension** - Extend multiple content at once

### Medium Priority
4. **Auto-renewal** - Opt-in automatic extensions
5. **Grace period** - 7-day grace after expiration
6. **Extension history** - Track all extensions

### Low Priority
7. **Discount tiers** - Bulk extension discounts
8. **Gift extensions** - Allow others to extend your content
9. **Subscription plans** - Unlimited storage packages

---

## ✨ Success Metrics

### KPIs to Track
- % of content extended before expiration
- Average extension duration
- Extension revenue (platform fee)
- Time from expiration warning to extension
- User satisfaction (post-extension survey)

---

**Implementation Status:** ✅ Complete
**Production Ready:** 🟡 Needs file size improvement & testing
**Next Steps:** Add file_size_bytes column, comprehensive testing
**Deployed By:** Claude Code
**Date:** November 19, 2025
