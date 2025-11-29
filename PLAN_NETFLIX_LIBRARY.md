# Master Plan: Netflix-Style Library with Customizable Categories

## Overview
Transform the library from a single grid to horizontal scrollable rows, each representing a category. Users can customize which 4 categories they want to see.

---

## Phase 1: Backend - Category Endpoints

### New Endpoint: `GET /api/content/categories`
Returns movies grouped by predefined categories:

```typescript
// Available category types:
- "recently_added"    // Last 20 movies added (sort by created_at desc)
- "popular"           // Most viewed (sort by total_streams desc)
- "highest_rated"     // 8+ rating (sort by external_rating desc)
- "decade_2020s"      // Movies from 2020-2029
- "decade_2010s"      // Movies from 2010-2019
- "decade_2000s"      // Movies from 2000-2009
- "decade_1990s"      // Movies from 1990-1999
- "decade_1980s"      // Movies from 1980-1989
- "decade_1970s"      // Movies from 1970-1979
- "genre_action"      // Genre = 1
- "genre_comedy"      // Genre = 2
- "genre_drama"       // Genre = 3
- "genre_horror"      // Genre = 4
- "genre_scifi"       // Genre = 5
- "genre_documentary" // Genre = 6
- "genre_thriller"    // Genre = 7
- "genre_romance"     // Genre = 8
- "genre_animation"   // Genre = 9
- "unwatched"         // Per-user: movies they haven't watched (requires auth)

// Request:
GET /api/content/categories?categories=recently_added,popular,decade_1980s,genre_action

// Response:
{
  "success": true,
  "categories": [
    {
      "id": "recently_added",
      "label": "Recently Added",
      "movies": [...],  // Up to 20 movies
      "totalCount": 27
    },
    {
      "id": "popular",
      "label": "Most Popular",
      "movies": [...],
      "totalCount": 27
    },
    ...
  ]
}
```

### Endpoint: `GET /api/content/category/:categoryId`
Fetch more movies from a specific category (for "See All" functionality):

```typescript
GET /api/content/category/decade_1980s?limit=50&offset=0

// Response:
{
  "success": true,
  "category": {
    "id": "decade_1980s",
    "label": "80s Classics",
    "movies": [...],
    "pagination": { total, limit, offset, hasMore }
  }
}
```

---

## Phase 2: Frontend - CategoryRow Component

### New Component: `CategoryRow.tsx`

```tsx
interface CategoryRowProps {
  categoryId: string;
  label: string;
  movies: Movie[];
  totalCount: number;
  onMovieClick: (movie: Movie) => void;
  onSeeAll: (categoryId: string) => void;
}
```

**Features:**
- Horizontal scrollable row of movie posters
- Left/Right arrow buttons for scrolling (hide on mobile, use touch scroll)
- "See All →" link at end of row
- Smooth scroll animation
- Shows ~5-6 movies at a time on desktop, 2-3 on mobile
- Hover effects on posters (same as current)

### Styling:
```
[Recently Added]                              [See All →]
◀ | 🎬 🎬 🎬 🎬 🎬 🎬 | ▶
    ←── scrollable ──→
```

---

## Phase 3: Frontend - Category Picker/Settings

### User Preferences Storage
- Store selected categories in `localStorage` for guests
- Store in database `user_preferences` table for logged-in users (optional, can skip initially)

### Default Categories:
1. Recently Added
2. Most Popular
3. Highest Rated
4. (Dynamic based on content - e.g., most common decade or genre)

### Category Picker UI

**Option A: Gear icon that opens modal**
```
[⚙️ Customize] button in header

Modal:
┌─────────────────────────────────────┐
│  Customize Your Library             │
│                                     │
│  Select 4 categories to display:    │
│                                     │
│  [x] Recently Added                 │
│  [x] Most Popular                   │
│  [ ] Highest Rated                  │
│  [ ] 2020s                          │
│  [x] 1980s                          │
│  [ ] 1990s                          │
│  [x] Action                         │
│  [ ] Comedy                         │
│  ...                                │
│                                     │
│  [Save]  [Reset to Default]         │
└─────────────────────────────────────┘
```

**Option B: Drag-and-drop reordering (more complex)**

---

## Phase 4: Library Page Refactor

### New Structure:

```tsx
// library/page.tsx

return (
  <div>
    <Header />

    {/* Search bar - still allows searching all content */}
    <SearchBar onSearch={...} />

    {/* Customize button */}
    <button onClick={openCategoryPicker}>
      ⚙️ Customize Categories
    </button>

    {/* Category rows */}
    {selectedCategories.map(cat => (
      <CategoryRow
        key={cat.id}
        categoryId={cat.id}
        label={cat.label}
        movies={cat.movies}
        onMovieClick={handleMovieClick}
        onSeeAll={handleSeeAll}
      />
    ))}

    {/* Category Picker Modal */}
    <CategoryPickerModal ... />

    {/* Movie Details Modal (existing) */}
    <MovieDetailsModal ... />
  </div>
);
```

### "See All" Page
When user clicks "See All" on a category:
- Could navigate to `/library?category=decade_1980s`
- Shows full grid view with pagination/load more
- Keep existing filter UI for this view

---

## Phase 5: Search Integration

Keep a search bar at the top that:
- When empty: shows category rows
- When typing: switches to full grid view with search results
- Uses existing filter system

---

## Implementation Order

### Step 1: Backend (1 session)
- [ ] Add `GET /api/content/categories` endpoint
- [ ] Add `GET /api/content/category/:id` endpoint
- [ ] Define all category types and their queries

### Step 2: CategoryRow Component (1 session)
- [ ] Create `CategoryRow.tsx`
- [ ] Horizontal scroll with arrows
- [ ] Movie poster cards (reuse existing styling)
- [ ] "See All" link

### Step 3: Library Page Refactor (1 session)
- [ ] Fetch categories on page load
- [ ] Render CategoryRow for each
- [ ] Keep search functionality
- [ ] Handle "See All" navigation

### Step 4: Category Picker (1 session)
- [ ] Create modal component
- [ ] Checkbox list of available categories
- [ ] Save to localStorage
- [ ] Load preferences on mount

### Step 5: Polish (1 session)
- [ ] Loading states
- [ ] Empty states per category
- [ ] Mobile responsiveness
- [ ] Smooth animations

---

## Database Changes Needed

**None required!** All category logic uses existing content table fields:
- `created_at` for recently added
- `total_streams` for popular
- `external_rating` for highest rated
- `year` for decades
- `genre` for genres
- `membership_watches` for unwatched (existing)

---

## Questions to Decide

1. **How many categories to show?**
   - Suggested: 4 customizable

2. **Should "See All" be a new page or expand in place?**
   - Suggested: Navigate to filtered grid view

3. **Should category order be customizable?**
   - Suggested: Not initially, just which ones to show

4. **Save preferences to database or just localStorage?**
   - Suggested: localStorage first, database later

---

## Mockup

```
┌────────────────────────────────────────────────────────────────┐
│  🔍 Search movies...                            [⚙️ Customize] │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Recently Added                                    See All →   │
│  ◀ [🎬][🎬][🎬][🎬][🎬][🎬] ▶                                  │
│                                                                │
│  Most Popular                                      See All →   │
│  ◀ [🎬][🎬][🎬][🎬][🎬][🎬] ▶                                  │
│                                                                │
│  80s Classics                                      See All →   │
│  ◀ [🎬][🎬][🎬][🎬][🎬][🎬] ▶                                  │
│                                                                │
│  Action Movies                                     See All →   │
│  ◀ [🎬][🎬][🎬][🎬][🎬][🎬] ▶                                  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Ready to Start?

This is a medium-sized feature. We can build it incrementally:
1. Start with backend endpoints
2. Build one category row
3. Integrate into library page
4. Add customization last

Let me know when you want to begin!
