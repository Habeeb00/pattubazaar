# Billboard Grid System

## Overview

The Billboard Grid is a 28×14 interactive slot booking system with drag-to-select, keyboard navigation, tooltips, and admin controls.

## Features

### ✨ **User Interactions**

- **Click & Drag Selection**: Select rectangular areas by clicking and dragging
- **Keyboard Navigation**: 
  - Arrow keys to move focus
  - Enter to toggle selection
  - Shift+Arrows to expand selection
  - Esc to clear selection
- **Visual Feedback**: Green outline for selected slots
- **Tooltips**: Hover over booked ads to see details
- **Responsive**: Works on all screen sizes

### 🎯 **Slot States**

1. **Available** (Empty, dark slate) - Can be selected
2. **Selected** (Green outline) - Currently selected for booking
3. **Booked** (Shows image/content) - Already purchased by a venue

### 🔧 **Admin Features**

Toggle `isAdmin` in `App.tsx` to enable:
- Remove button on hover
- Visit link button
- Ad management overlay

### ♿ **Accessibility**

- `role="grid"` and `role="gridcell"` for screen readers
- `aria-selected` states
- `aria-live` region announcing selection changes
- Full keyboard navigation support
- Focus indicators

## Components

### `BillboardGrid.tsx`

Main grid component with:
- 392 total slots (28 columns × 14 rows)
- Drag-to-select functionality
- Keyboard navigation
- Tooltip system
- Admin overlay

**Props:**
```typescript
{
  ads: Ad[]                          // Array of booked ads
  selectedPlots: string[]            // Currently selected plot IDs
  setSelectedPlots: (plots: string[]) => void
  purchasedPlotIds: Set<string>      // Set of booked plot IDs
  isAdmin: boolean                   // Enable admin features
  onDeleteAd: (adId: string) => void
  onStartPurchase?: (plots: string[]) => void
}
```

### `GridToolbar.tsx`

Selection toolbar showing:
- Number of selected slots
- Dimensions (width × height)
- Clear button
- Book/Purchase button

## Data Structure

### Ad Type

```typescript
interface Ad {
  id: string
  plots: string[]        // e.g., ["0-0", "0-1", "1-0", "1-1"]
  imageUrl: string
  message: string
  link?: string
  venueName?: string
  createdAt?: string
}
```

### Plot ID Format

Plots are identified by `"row-column"` format:
- `"0-0"` = Top-left corner
- `"13-27"` = Bottom-right corner

## Usage Example

```tsx
import { BillboardGrid } from './components/BillboardGrid'
import type { Ad } from './types'

function MyApp() {
  const [selectedPlots, setSelectedPlots] = useState<string[]>([])
  const [ads, setAds] = useState<Ad[]>([])
  
  const purchasedPlotIds = new Set(ads.flatMap(ad => ad.plots))

  const handlePurchase = (plots: string[]) => {
    // Your purchase logic here
    const newAd: Ad = {
      id: Date.now().toString(),
      plots,
      imageUrl: 'https://example.com/image.jpg',
      message: 'My Billboard Ad',
      venueName: 'My Venue',
    }
    setAds([...ads, newAd])
    setSelectedPlots([])
  }

  return (
    <BillboardGrid
      ads={ads}
      selectedPlots={selectedPlots}
      setSelectedPlots={setSelectedPlots}
      purchasedPlotIds={purchasedPlotIds}
      isAdmin={false}
      onDeleteAd={(id) => setAds(ads.filter(a => a.id !== id))}
      onStartPurchase={handlePurchase}
    />
  )
}
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Arrow Keys` | Move focus to adjacent cell |
| `Shift + Arrow Keys` | Expand selection |
| `Enter` | Toggle focused cell selection |
| `Esc` | Clear all selections |
| `Tab` | Focus the grid |

## Styling

The grid uses Tailwind CSS with custom classes:
- `.billboard-grid` - Grid background with subtle lines
- `.slot-card` - Individual slot styling
- `.countdown-digit` - Retro LED-style numbers

## Integration with Supabase

To connect with Supabase:

1. **Fetch Ads:**
```typescript
const { data: ads } = await supabase
  .from('ads')
  .select('*')
```

2. **Create Ad:**
```typescript
const { data, error } = await supabase
  .from('ads')
  .insert({
    plots: selectedPlots,
    image_url: imageUrl,
    message: message,
    venue_id: user.id,
  })
```

3. **Real-time Updates:**
```typescript
supabase
  .channel('ads')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'ads' },
    (payload) => {
      // Update local state
    }
  )
  .subscribe()
```

## Testing

### Manual Testing Checklist

- [ ] Click and drag to select multiple slots
- [ ] Cannot select already-booked slots
- [ ] Keyboard navigation works
- [ ] Tooltips appear on hover
- [ ] Admin overlay shows when `isAdmin=true`
- [ ] Selection clears after booking
- [ ] Responsive on mobile

### Automated Testing (Recommended)

Use Playwright for e2e tests:

```typescript
test('can select and book slots', async ({ page }) => {
  await page.goto('http://localhost:3000')
  
  // Select a 2x2 area
  await page.locator('[aria-label="Book slot 0-0"]').click()
  await page.keyboard.down('Shift')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.up('Shift')
  
  // Verify selection
  const selected = await page.locator('[aria-selected="true"]').count()
  expect(selected).toBe(4)
  
  // Book slots
  await page.locator('text=Book Slots').click()
  // ... rest of purchase flow
})
```

## Performance

- **Grid Size**: 392 cells (28×14)
- **Render Optimization**: Uses `useMemo` for expensive calculations
- **Event Handling**: Debounced drag events
- **Portal Rendering**: Tooltips use React portals for optimal performance

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers

## Future Enhancements

- [ ] Multi-user real-time collaboration
- [ ] Undo/redo selection history
- [ ] Preset slot sizes (1x1, 2x2, 4x4, etc.)
- [ ] Color-coded slot categories
- [ ] Drag-to-move existing ads (admin)
- [ ] Export billboard as image
- [ ] Analytics dashboard

---

Built with ❤️ using React, TypeScript, and Tailwind CSS
