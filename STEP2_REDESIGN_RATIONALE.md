# Step 2 UI Redesign - RecommendationSelector

## 🎯 Mục Đích & Tư Duy Thiết Kế

### Vấn Đề Cũ
1. **Interface Rối Rắm**: Recommendations + Save options riêng biệt ở nhiều chỗ
2. **All-or-Nothing Logic**: "Apply All" button ép user phải chấp nhận tất cả recommendations
3. **No Flexibility**: Không thể chọn từng category cách riêng
4. **Wasteful Space**: 2 preview images ở right sidebar không cần thiết ở step này
5. **Ambiguous "Keep Current"**: Không rõ "keep current" không phải "option mới"

### Giải Pháp Mới = RecommendationSelector

```
┌─────────────────────────────────────────┐
│  Step 2: Character & Product Analysis   │
├─────────────────────────────────────────┤
│                                         │
│  📊 Character Profile                   │
│     Gender, Age, Body Type, etc.        │
│                                         │
│  👕 Product Details                     │
│     Garment Type, Colors, etc.          │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  ✨ AI Recommendations                  │
│  (RecommendationSelector)               │
│                                         │
│  [Hairstyle]                            │
│  ├─ Current: short straight             │
│  ├─ AI suggests: long curly             │
│  ├─ Why? [▼ Collapsible full reason]   │
│  ├─ [✓ Apply] [⟲ Keep] [☆ Choose]     │
│  ├─ [☐ Save as new option]             │
│  └─                                     │
│                                         │
│  [Lighting]                             │
│  ├─ Current: bright                     │
│  ├─ AI suggests: soft diffused          │
│  │  ...                                 │
│                                         │
│  [✓ Apply Selections & Continue →]      │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🔑 Chính Key Features

### 1️⃣ 3 Action Buttons Per Category

```javascript
// 3 Options:

A) ✓ Apply AI Recommendation
   - Use AI's suggestion immediately
   - value = recommendation.choice
   
B) ⟲ Keep Current  
   - Don't change anything
   - value = currentValue (unchanged)
   - ❌ NOT an "option mới" → just preserves existing
   
C) ☆ Choose Manually
   - Dropdown to select from saved options
   - Or create new from list
   - value = dropdown selection
```

**Why This Design?**
- **Flexibility**: Not forced to accept all recommendations
- **Clarity**: Each action has clear meaning
- **Reversibility**: Can change decisions per-category before final apply
- **Non-binary**: More than just yes/no

---

### 2️⃣ Collapsible "Why" Section

```jsx
// Old behavior:
Why: From AI  // ❌ Truncated, unclear

// New behavior:
Why? [▼ Click to expand]
    ┌─────────────────────────────────────┐
    │ "Long curly hair complements your   │
    │ face shape and the soft studio      │
    │ lighting. It creates more visual    │
    │ interest and aligns with current   │
    │ outfit style trends visible in      │
    │ the character image..."             │
    └─────────────────────────────────────┘
```

**Why This Matters?**
- **Users Need Full Context**: To trust / understand AI decisions
- **Don't Want Wall of Text**: But CAN read if they want to verify
- **Collapse = De-clutter**: Keep UI clean but provide details on demand
- **Reasoning = Training Effect**: Users learn why AI recommends things

---

### 3️⃣ "Save as New Option" Checkbox

```javascript
// Logic:

IF user checks "Save as option":
   → After applying selections
   → Backend saves: { category: 'hairstyle', value: 'long curly' }
   → Next time user creates character
   → 'long curly' appears in dropdown as saved option
   → Reusable instantly

// Different from "Keep Current":
Keep Current = 💾 Preserves current value (không save)
Save = 💾 Creates new reusable option
```

**Why Separate Them?**
1. **Not Every Recommendation Deserves Saving**
   - User might apply it just for this project
   - Different styles for different scenarios

2. **Intentional Curation**
   - User selects which recommendations are versatile enough to reuse
   - Builds personal style library over time

3. **Different DB Operations**
   - "Keep" = no backend call
   - "Save" = new option record + dropdown entry

---

### 4️⃣ Unified Flow (No Right Sidebar Preview Images)

**Old Layout:**
```
┌────────────────────┬──────────────────┐
│ Left Content       │ Right Sidebar    │
│ (Analysis)         │ - Summary        │
│                    │ - NewOptions     │
│                    │ - 2 Preview IMG  │ ❌ Wasteful
│                    │ - Save Buttons   │    scattered
│                    │                  │
└────────────────────┴──────────────────┘
```

**New Layout:**
```
┌────────────────────┬──────────────────┐
│ Left Content       │ Right Sidebar    │
│ - Character Info   │ (Empty for Step2)│
│ - Product Info     │ Info box         │
│ - Recommendations  │                  │
│   • 3 buttons/cat  │ Cleaner, less    │
│   • Save checkbox  │ distraction      │
│   • Full "Why"     │                  │
│                    │                  │
└────────────────────┴──────────────────┘
```

**Benefits:**
- ✅ Consolidated UI → less scrolling
- ✅ Images removed → focus on decisions
- ✅ All controls in one place
- ✅ Easier to understand flow: Analyze → Decide per-category → Apply → Next

---

## 💡 Usage Scenarios

### Scenario 1: Trust AI (Apply Most)
```
Hairstyle: short → [✓ Apply] AI says "long curly" ✓
Lighting: bright → [⟲ Keep] User likes current ✓
Makeup: minimal → [✓ Apply] AI says "sophisticated" ✓
  ☐ Should I save "sophisticated makeup"? YES ✓
Mood: energetic → [☆ Choose] Pick "moody" from dropdown ✓
  
→ Click "Apply Selections & Continue"
→ Step 3: Uses long curly + bright + sophisticated + moody
→ Dropdown now has "sophisticated makeup" as future option
```

### Scenario 2: Partial Use (Keep Some, Apply Some)
```
Hairstyle: curly → [⟲ Keep] "I like my curls, AI" ✓
Lighting: dim → [✓ Apply] AI says "warm" (modern trend) ✓
  ☐ Save "warm lighting"? YES ✓
Mood: cool → [☆ Choose] Pick "adventurous" ✓
Shoes → [⟲ Keep] ✓

→ "warm lighting" saved for next character
→ Otherwise, preserves user's choices
```

### Scenario 3: Full Control (Choose Everything)
```
Hairstyle: [☆ Choose] → dropdown to "styles_for_shooting_1"
Lighting: [☆ Choose] → "professional_studio"
Mood: [☆ Choose] → "energetic"
...
→ User has full control
→ Can opt-out of AI altogether
```

---

## 🔄 Technical Flow

### Backend: handleApplyRecommendationSelection()

```javascript
// Receives decisions object from RecommendationSelector:
decisions = {
  hairstyle: {
    action: 'apply',        // or 'keep', 'choose'
    finalValue: 'long curly',
    saveAsOption: true
  },
  lighting: {
    action: 'keep',
    finalValue: 'bright',
    saveAsOption: false
  },
  ...
}

// Process:
1. Build newSelectedOptions from finalValue
2. Save recommendations where saveAsOption=true
3. Update Step 3 with merged options
4. Navigate to Step 3
```

### Frontend: RecommendationSelector Component

```jsx
// State per category:
decisions[category] = {
  action: 'keep',           // User's choice
  chosenOption: null,       // If action='choose'
  saveAsOption: false,      // Should save?
  expandWhy: false          // Collapse/expand
}

// On Apply:
→ Loop each category
→ Get finalValue based on action
→ Save if marked
→ Update parent state
→ Navigate to Step 3
```

---

## ✅ Why This Is Better

| Aspect | Old | New |
|--------|-----|-----|
| **Clarity** | Ambiguous | 3 clear choices |
| **Flexibility** | All-or-nothing | Per-category |
| **UI Clutter** | 2 images + scattered UI | Unified, clean |
| **"Why" Info** | Truncated | Full + collapsible |
| **Option Saving** | Always saved | Intentional (checkbox) |
| **Keep Current** | Confusing | Explicit button |
| **Next Step** | Fast but forced | Deliberate choices |

---

## 🚀 Testing Checklist

- [ ] Upload 2 images → Step 1 complete
- [ ] Click "Start Analysis" → Analyzing...
- [ ] Step 2 appears with:
  - [ ] Character Profile section
  - [ ] Product Details section
  - [ ] RecommendationSelector with all categories
- [ ] For each recommendation:
  - [ ] [✓ Apply] button changes recommendation to AI choice
  - [ ] [⟲ Keep] button shows "current value"
  - [ ] [☆ Choose] button opens dropdown
  - [ ] Why? [▼] expands/collapses full reason
  - [ ] Checkbox "Save as option" toggles
  - [ ] Final value updates in right column
- [ ] Apply different actions to different categories
- [ ] Check few "Save" boxes
- [ ] Click "Apply Selections & Continue"
- [ ] Step 3 opens with merged options
- [ ] Verify saved options in dropdown (Step 3)

---

## 📝 Design Philosophy

### Principle 1: User Control
Don't force users to accept all recommendations. Let them customize per-category.

### Principle 2: Transparency  
Show full "Why" reasoning (collapsable) so users understand AI decisions.

### Principle 3: Intention
Only save options users explicitly want to reuse. Not every rec needs saving.

### Principle 4: Clarity
"Keep Current" ≠ "Save Option". Very different actions, very different buttons.

### Principle 5: Focus
Remove visual clutter (preview images). Keep UI to 1 unified recommendation selector.

---

## 🎨 UI Component Hierarchy

```
ImageGenerationPage (Step 2)
├── CharacterProductSummary
│   ├── Character Profile (gender, age, etc.)
│   └── Product Details (garment, colors, etc.)
└── RecommendationSelector
    ├── Header (6 suggestions detected)
    ├── RecommendationCard[] (per category)
    │   ├── Category Header (current + AI suggests)
    │   ├── Collapsible Why Section
    │   ├── Action Buttons (Apply, Keep, Choose)
    │   ├── Choose Dropdown (if chosen)
    │   └── Save Checkbox
    ├── Info Box (how it works)
    └── Apply Button (Apply Selections & Continue)
```

---

## 🔮 Future Enhancements

1. **Preview Live Changes**
   - Show preview of character with applied recommendations
   - Update preview as user clicks different actions

2. **Confidence Score**
   - Show AI confidence for each recommendation
   - "95% confident this lighting works"

3. **Similar Recommendations**
   - "Also consider: soft-warm, diffused-warm"
   - Let user see alternatives

4. **Recommendation History**
   - "Last time you applied: long curly (for product XYZ)"
   - Learn user patterns

5. **Batch Actions**
   - "Apply All" button (but with warning)
   - "Keep All" button
