# 5-Use-Cases Quick Reference Guide

## 📋 One-Page Use Case Matrix

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         PROMPT TEMPLATE USE CASES MATRIX                           │
├──────────────┬──────────────────────────────┬──────────────────┬──────────────────┤
│ USE CASE     │ BEST FOR                     │ PRIMARY FOCUS    │ TOP PRIORITY     │
├──────────────┼──────────────────────────────┼──────────────────┼──────────────────┤
│ 🛍️ ECOM     │ Online stores, catalogs      │ Product clarity  │ Details visible  │
│ 📱 SOCIAL    │ Instagram, TikTok, engagement│ Character energy │ Trend-worthy     │
│ 👗 EDITORIAL │ Lookbooks, campaigns         │ Artistic vision  │ Magazine quality │
│ 🌿 LIFESTYLE │ Blogs, relatable stories     │ Real-world context│ Authentic feel  │
│ ⬅️➡️ BEFORE  │ Transformations, tutorials   │ Contrast visible │ Same person both │
└──────────────┴──────────────────────────────┴──────────────────┴──────────────────┘
```

## 🎯 Quick Selection Logic

```
Is product visibility the #1 priority?
├─ YES → Choose ECOMMERCE PRODUCT ✓
│
└─ NO: Do you need social media engagement?
   ├─ YES → Choose SOCIAL MEDIA CONTENT ✓
   │
   └─ NO: Do you want high-fashion/creative direction?
      ├─ YES → Choose FASHION EDITORIAL ✓
      │
      └─ NO: Do you need real-world context?
         ├─ YES → Choose LIFESTYLE SCENE ✓
         │
         └─ NO: Are you showing before/after?
            ├─ YES → Choose BEFORE-AFTER ✓
            │
            └─ NO: Just changing outfit on person?
               └─ Choose CHANGE-CLOTHES ✓
```

## 🔧 Technical Quick Reference

### Function Signatures (All Identical)
```javascript
buildEcommerceProductPrompt(analysis, selectedOptions, productFocus)
buildSocialMediaPrompt(analysis, selectedOptions, productFocus)
buildFashionEditorialPrompt(analysis, selectedOptions, productFocus)
buildLifestyleScenePrompt(analysis, selectedOptions, productFocus)
buildBeforeAfterPrompt(analysis, selectedOptions, productFocus)

// All Return: String prompt
// All Accept: (analysis, selectedOptions, productFocus)
```

### Router Location
**File:** `backend/services/smartPromptBuilder.js`  
**Lines:** 82-108 (Switch statement)  
**Function:** `buildDetailedPrompt()` 

### Implementation Location
**File:** `backend/services/smartPromptBuilder.js`  
**Lines:** 
- Ecommerce Product: 355-406
- Social Media: 411-497
- Fashion Editorial: 502-651
- Lifestyle Scene: 656-778
- Before-After: 783-859

## 🎨 Content Architecture Overview

### ECOMMERCE PRODUCT
```
Focus Pyramid:
    [PRODUCT]  ⬅ 80%
    [MODEL]    ⬅ 15%
    [BACKGROUND] ⬅ 5%

Lighting: Studio professional
Background: Pure white or neutral
Best For: Retail, e-commerce, shopping
```

### SOCIAL MEDIA
```
Focus Pyramid:
    [CHARACTER] ⬅ 60%
    [OUTFIT]    ⬅ 30%
    [LOCATION]  ⬅ 10% (aesthetic)

Lighting: Natural/golden hour
Background: Aesthetic but engaging
Best For: Instagram, TikTok, feeds
```

### FASHION EDITORIAL
```
Focus Pyramid:
    [ARTISTIC VISION] ⬅ 50%
    [STYLING]        ⬅ 40%
    [LOCATION]       ⬅ 10%

Lighting: Dramatic/artistic
Background: Supports story
Best For: Lookbooks, magazines, campaigns
```

### LIFESTYLE SCENE
```
Focus Pyramid:
    [PERSON]        ⬅ 40%
    [ENVIRONMENT]   ⬅ 40%
    [OUTFIT]        ⬅ 20%

Lighting: Natural/warm
Background: Real-world context
Best For: Blogs, authentic stories, websites
```

### BEFORE-AFTER
```
Focus Pyramid:
    [TRANSFORMATION] ⬅ 50%
    [SAME PERSON]    ⬅ 40%
    [CONTRAST]       ⬅ 10%

Layout: Split/side-by-side
Consistency: Critical
Best For: Tutorials, proof-points, transformations
```

## ⚡ Quick Implementation

### Backend Integration (Already Done ✓)

```javascript
// In buildDetailedPrompt() Line 85-108
case 'ecommerce-product':
  promptStr = buildEcommerceProductPrompt(analysis, selectedOptions, productFocus);
  break;
case 'social-media':
  promptStr = buildSocialMediaPrompt(analysis, selectedOptions, productFocus);
  break;
// ... etc
```

### Frontend Already Supports (No Changes Needed ✓)

```javascript
// ImageGenerationPage.jsx already has:
const USE_CASES = [
  { value: 'ecommerce-product', label: '🛍️ Ecommerce Product' },
  { value: 'social-media', label: '📱 Social Media' },
  { value: 'fashion-editorial', label: '👗 Fashion Editorial' },
  { value: 'lifestyle-scene', label: '🌿 Lifestyle' },
  { value: 'before-after', label: '⬅️➡️ Before-After' },
  // ... others
];
```

## 🚀 How They Work

### 1️⃣ User Selects Use Case
*Example: "📱 Social Media"*

### 2️⃣ Frontend Sends Request
```javascript
{
  useCase: 'social-media',
  selectedOptions: { scene, lighting, mood, ... },
  productFocus: 'full-outfit'
}
```

### 3️⃣ Backend Router Receives
`buildDetailedPrompt(analysis, selectedOptions, 'social-media', 'full-outfit')`

### 4️⃣ Router Matches Use Case
Switch statement finds: `case 'social-media':`

### 5️⃣ Routes to Function
`buildSocialMediaPrompt(analysis, selectedOptions, productFocus)`

### 6️⃣ Function Generates Tailored Prompt
- Character energy specifications
- Trend-focused styling guidance
- Instagram aesthetic requirements
- Engagement-optimized composition

### 7️⃣ Returns to Router
String prompt with social-media-specific instructions

### 8️⃣ Processes Negative Prompt
`buildNegativePrompt()` adds "what NOT to do"

### 9️⃣ Returns Complete Object
```javascript
{
  positive: "detailed social media prompt...",
  negative: "don't make it...",
  metadata: { useCase: 'social-media', ... }
}
```

### 🔟 AI Generates Image
Google Flow API uses optimized prompt

## 🎓 Use Case Decision Tree (Detailed)

### Q1: What's Your Primary Goal?
- **Product Visibility** → ECOMMERCE PRODUCT
- **Social Engagement** → SOCIAL MEDIA
- **Artistic Expression** → FASHION EDITORIAL
- **Real-World Context** → LIFESTYLE SCENE
- **Show Transformation** → BEFORE-AFTER
- **Just Change Outfit** → CHANGE-CLOTHES

### Q2: What Platform/Medium?
- **E-commerce website** → ECOMMERCE PRODUCT
- **Instagram/TikTok feed** → SOCIAL MEDIA
- **Magazine/Lookbook** → FASHION EDITORIAL
- **Blog/Website article** → LIFESTYLE SCENE
- **Tutorial/Comparison** → BEFORE-AFTER
- **Virtual try-on app** → CHANGE-CLOTHES

### Q3: Who's the Hero?
- **The Product** → ECOMMERCE PRODUCT
- **The Person Wearing It** → SOCIAL MEDIA or LIFESTYLE
- **The Styling/Vision** → FASHION EDITORIAL
- **The Transformation** → BEFORE-AFTER
- **The Moment/Scene** → LIFESTYLE SCENE

### Q4: What Tone?
- **Professional/Commercial** → ECOMMERCE PRODUCT
- **Trendy/Engaging** → SOCIAL MEDIA
- **Sophisticated/Artistic** → FASHION EDITORIAL
- **Authentic/Relatable** → LIFESTYLE SCENE
- **Impactful/Compelling** → BEFORE-AFTER

## 📊 Output Quality Guidelines

### ECOMMERCE PRODUCT
✅ **Excellent if:** Product details are crystal clear, colors accurate, professional presentation  
❌ **Fails if:** Background distracting, details hidden, colors off, feels artistic instead of commercial

### SOCIAL MEDIA
✅ **Excellent if:** Character confident and engaging, trending aesthetic, algorithm-friendly, shareable  
❌ **Fails if:** Stiff pose, boring composition, muted colors, doesn't look scrollable

### FASHION EDITORIAL
✅ **Excellent if:** Sophisticated styling, artistic composition, magazine-ready, story-driven  
❌ **Fails if:** Too commercial, lacks artistry, average composition, feels generic

### LIFESTYLE SCENE
✅ **Excellent if:** Authentic feel, real-world context clear, relatable but aspirational, cohesive story  
❌ **Fails if:** Too staged, context missing, character uncomfortable, disconnected outfit from scene

### BEFORE-AFTER
✅ **Excellent if:** Same person throughout, clear transformation visible, contrast striking, impact obvious  
❌ **Fails if:** Different person, subtle changes, confusing contrast, impact not obvious

## 🔄 When to Use Each

### Recent Launch Day 1-7
**Strategy:** SOCIAL MEDIA focus
- Build engagement and buzz
- Create shareability
- Grow audience awareness

### Week 2-3 Build Authority
**Strategy:** Mix SOCIAL + EDITORIAL
- Continue engagement
- Show sophistication
- Build brand positioning

### Month 2+ Scale Sales
**Strategy:** ECOMMERCE + LIFESTYLE
- Convert interest to sales
- Show real-world usage
- Authentic testimonials

### Campaign Specific
**Before-After:** Transformation campaigns
**Lifestyle:** Authentic storytelling
**Editorial:** Luxury/high-end messaging

## 🛠️ Debugging Quick Tips

**"Image doesn't look right"** → Check selectedOptions (scene, lighting, mood)  
**"Character looks wrong"** → Verify analysis.character data is complete  
**"Product not visible enough"** → Use ECOMMERCE instead of the current use case  
**"Looks too stiff"** → Switch to SOCIAL MEDIA for more dynamic energy  
**"Needs to be more professional"** → Try FASHION EDITORIAL  
**"Needs real-world feel"** → Switch to LIFESTYLE SCENE  
**"Need to show transformation"** → Use BEFORE-AFTER  

## ✅ All Functions Status

```
✅ buildEcommerceProductPrompt() - IMPLEMENTED & TESTED
✅ buildSocialMediaPrompt() - IMPLEMENTED & TESTED
✅ buildFashionEditorialPrompt() - IMPLEMENTED & TESTED
✅ buildLifestyleScenePrompt() - IMPLEMENTED & TESTED
✅ buildBeforeAfterPrompt() - IMPLEMENTED & TESTED
✅ Switch statement routing - UPDATED
✅ Frontend support - READY
✅ Syntax validation - PASSED
✅ Production ready - YES
```

## 📞 Common Questions

**Q: Can I mix use cases?**
A: Not directly, but you can use selectedOptions to blend aesthetics

**Q: Which is best for beginners?**
A: Start with SOCIAL MEDIA (most forgiving) → LIFESTYLE SCENE (most practical)

**Q: Which generates highest quality?**
A: FASHION EDITORIAL (requires most specifications) but best for luxury/high-end

**Q: Can I use BEFORE-AFTER without 2 images?**
A: The function supports the concept - verify your data has before/after context

**Q: Do I need to modify frontend?**
A: No! Frontend already supports all use cases

**Q: How long to generate each?**
A: Same as always - Google Flow API time (~30-90 sec depending on API)

---

**Last Updated:** 2024  
**Status:** ✅ PRODUCTION READY  
**All 5 Use Cases:** FULLY IMPLEMENTED
