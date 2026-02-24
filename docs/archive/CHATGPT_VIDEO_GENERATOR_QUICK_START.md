# Quick Start - ChatGPT Video Generator 🚀

## How to Use the New System

### In VideoGenerationPage

**Step-by-Step**:

1. **Step 1: Settings** (existing, unchanged)
   - Upload source image
   - Select Duration & Provider
   - Choose Video Scenario
   - Click Next

2. **Step 2: Prompt** (NEW with choice)
   - See two mode buttons: `📋 Template` | `✨ ChatGPT`
   - Click `✨ ChatGPT` button to activate new generator
   
3. **Configure Generation**:
   ```
   Input:
   - Video Flow:      👗 Fashion Flow (or other scenario)
   - Video Style:     🎬 Slow Motion (or other style)
   - Product Name:    e.g., "Summer Dress"
   - Product Details: "Navy blue, flowing fabric, minimalist..."
   - Target Audience: "Women 18-35"
   - Generator Type:  Choose one of 6:
                      🎬 Scenario Script (default)
                      🎨 Style Variations
                      🚶 Movement Detail
                      📹 Camera Guidance
                      💡 Lighting Setup
                      📚 Template Library
   ```

4. **View Segment Configuration**:
   ```
   Display shows automatically:
   📊 Segment Configuration
   Total Duration: 20s
   Number of Segments: 2
   Duration per Segment: 10s ⭐
   ```

5. **Generate Segments**:
   - Click `Generate Segments via ChatGPT` button
   - Wait for ChatGPT response (30-120 seconds)
   - Backend handles ChatGPT conversation
   - Response is parsed automatically

6. **Review & Edit Segments** (NEW screen):
   ```
   Shows all segments with:
   ✓ Segment Number & Name
   ✓ Duration (calculated correctly)
   ✓ Time Code (0:00-0:10, etc.)
   ✓ Script (auto-filled from ChatGPT)
   ✓ Movements (auto-filled)
   ✓ Camera Work (auto-filled)
   ✓ Lighting (auto-filled)
   ✓ Music/Audio (auto-filled)
   
   You can:
   - Expand each segment
   - Edit any field (script, movements, etc.)
   - Regenerate if not satisfied
   ```

7. **Submit & Continue**:
   - Click `✅ Use These Segments`
   - Segments passed to video generation
   - Proceed to Step 3

---

## Duration Calculation Examples

### Example 1: 20s Flow with 2 Segments
```
Input:      Duration 20s, Scenario "Fashion Flow"
Calculated: 2 segments
Per Segment: 20s ÷ 2 = 10s each
TimeCode:   Segment 1: 0:00-0:10, Segment 2: 0:10-0:20
```

### Example 2: 30s Flow with 3 Segments
```
Input:      Duration 30s, Scenario "Product Zoom"
Calculated: 3 segments
Per Segment: 30s ÷ 3 = 10s each
TimeCode:   0:00-0:10, 0:10-0:20, 0:20-0:30
```

### Example 3: 25s Flow with 4 Segments
```
Input:      Duration 25s, Scenario "Styling Tips"
Calculated: 4 segments
Per Segment: 25s ÷ 4 = 6.25s each
TimeCode:   0:00-0:06, 0:06-0:13, 0:13-0:19, 0:19-0:25
```

---

## 6 Generator Types Explained

### 1️⃣ **Scenario Script** (Default)
Generates detailed segment-by-segment scripts

**Best for**: Creating full video scripts from scratch
**Output**: Complete scripts for each segment with timing
**Example Request**: 
```
Flow: Fashion Flow (20s, 2 segments)
Product: Summer Dress
Creates: 2 segments with scripts, movements, camera, lighting
```

### 2️⃣ **Style Variations**
Creates 5+ different stylistic approaches for same product

**Best for**: Exploring multiple creative directions
**Output**: 5-10 unique concepts with different emotional tones
**Example Request**:
```
Product: Shoes
Count: 5 variations
Creates: 5 completely different ways to showcase the shoes
```

### 3️⃣ **Movement Detail**
Frame-by-frame breakdown of specific movements

**Best for**: Detailed choreography for key moments
**Output**: Initial pose, 25%, 50%, 75%, 100% frame breakdown
**Example Request**:
```
Movement: "360-degree turn"
Duration: 8 seconds
Product: Jacket
Creates: Exact positions at each frame
```

### 4️⃣ **Camera Guidance**
Detailed camera work specifications per segment

**Best for**: Technical camera setup and cinematography
**Output**: Shot composition, position, movement, lenses per segment
**Example Request**:
```
Scenario: Fashion Flow (2 segments)
Aspect Ratio: 9:16
Products: Outfit details
Creates: Camera specs for each segment (wide shot, close-up, etc.)
```

### 5️⃣ **Lighting Setup**
Complete lighting design specifications

**Best for**: Studio setup and lighting configuration
**Output**: Key light, fill light, back light, hair light, background
**Example Request**:
```
Scenario: Fashion Flow
Style: Professional
Product: Designer Handbag
Creates: Complete lighting diagram and equipment list
```

### 6️⃣ **Template Library**
Generate 20-30 completely unique video templates

**Best for**: Inspiration and discovering new concepts
**Output**: 20-30 unique video ideas with setups, difficulty, use cases
**Example Request**:
```
Count: 30 templates
Creates: 30 diverse templates with energy levels, complexity, examples
Resusable for: Future videos with similar products
```

---

## Auto-Fill & Parsing

### What Gets Auto-Filled?

When ChatGPT generates a response, the system intelligently extracts:

```javascript
✓ Segment names/titles
✓ Duration per segment
✓ Time codes (MM:SS format)
✓ Main script/description
✓ Movement descriptions
✓ Camera work specifications
✓ Lighting recommendations
✓ Music/audio suggestions
```

### Fallback Behavior

If ChatGPT response doesn't include certain elements:
- Default values are used
- User can manually fill in empty fields
- Fields are clearly marked if missing

### Example Parsing

**ChatGPT Raw Response**:
```
Segment 1: Entrance
Duration: 10 seconds
The model walks forward with confidence, showing the dress from the front.
Camera: Medium shot at eye level, smooth tracking.
Lighting: Key light from left front, soft fill light from right.
Music: Upbeat background track.
```

**Auto-Filled Segment**:
```
Name:               Entrance
Duration:           10s
TimeCode:           0:00-0:10
Script:             The model walks forward with confidence...
Movements:          Walk forward with confidence
Camera Work:        Medium shot at eye level, smooth tracking
Lighting:           Key light from left front, soft fill light from right
Music Description:  Upbeat background track
```

---

## Editing Segments

### How to Edit

1. Click on segment card to expand
2. Click in any text field to edit
3. Changes save automatically
4. Can add/remove/customize any field

### Common Edits

```
Change Duration:     Edit the "Duration" field (in seconds)
Adjust Script:       Click script textarea and edit
Add Movements:       Add or modify movement descriptions
Refine Camera:       Update camera work specs
Customize Lighting:  Adjust lighting setup
Change Music:        Update audio recommendations
```

### Best Practices

- ✅ Keep scripts under 100 words per segment
- ✅ Be specific with camera instructions
- ✅ Reference products explicitly
- ✅ Include timing info (how many frames, duration)
- ✅ Describe performer energy/mood

---

## Troubleshooting

### Problem: Segments not appearing after generation

**Solution**:
1. Check browser console for errors (F12)
2. Verify ChatGPT response was received
3. Try regenerating with same settings
4. Check segment duration is correct

### Problem: Some data not auto-filled

**Solution**:
1. Manually fill in empty fields
2. Regenerate with more specific generator type
3. Try different scenario/style combination

### Problem: Generation taking too long

**Solution**:
1. ChatGPT browser automation can take 1-2 minutes
2. Wait for loader to complete
3. Verify internet connection
4. Check browser console for timeout errors

### Problem: Can't edit segments

**Solution**:
1. Make sure segment is expanded (click to expand)
2. Check if still generating (wait for completion)
3. Verify textarea is not read-only
4. Try refreshing page

---

## Workflow Comparison

### Old Way (Template-Based)
```
1. Select scenario
2. Pick template from database
3. Manually fill in form fields
4. Submit
⏱️  Time: 2-5 minutes
```

### New Way (ChatGPT-Enhanced)
```
1. Select scenario  
2. Configure product info
3. Click "Generate via ChatGPT"
4. Review auto-filled segments
5. Edit as needed
6. Submit
⏱️  Time: 3-5 minutes (includes ChatGPT response time)

✨ Benefit: AI-generated creative content + user control
```

---

## Tips for Best Results

### 1. **Be Specific with Product Details**
```
❌ "Dress"
✅ "Navy blue summer dress with flowing fabric, minimalist design, 
   perfect for beach weddings"
```

### 2. **Target Audience Matters**
```
❌ "General audience"
✅ "Women 18-35, urban professionals, fashion-forward"
```

### 3. **Choose Right Generator**
```
Need full video script?      → Use "Scenario Script"
Want multiple styles?        → Use "Style Variations"
Need camera techniques?      → Use "Camera Guidance"
Want professional setup?     → Use "Lighting Setup"
```

### 4. **Review ChatGPT Output**
- Don't accept first version blindly
- Make small tweaks for your brand
- Personalize language/tone

### 5. **Reuse Good Segments**
- If you find a great segment setup
- Save it for similar products
- Adapt rather than regenerate

---

## Keyboard Shortcuts (Future)

*Coming soon*:
- `Ctrl+Enter` → Generate segments
- `Cmd+Z` → Undo changes
- `Tab` → Move between segment fields
- `Shift+Tab` → Previous field

---

## Supported Flows + Segment Counts

| Flow | Duration | Segments | Per-Segment |
|------|----------|----------|------------|
| Fashion Flow | 20s | 2 | 10s |
| Product Zoom | 20s | 3 | 6.7s |
| Styling Tips | 25s | 4 | 6.25s |
| Casual Vibe | 20s | 2 | 10s |
| Glamour Slow-Mo | 20s | 2 | 10s |
| Dynamic Energy | 20s | 3 | 6.7s |
| Custom | Varies | Varies | Auto-calc |

---

## Need Help?

### Documentation
- Full guide: `CHATGPT_VIDEO_GENERATION_INTEGRATION.md`
- Video scenarios: `frontend/src/constants/videoScenarios.js`
- API reference: Check backend routes

### Common Questions

**Q: How long does generation take?**
A: 30-120 seconds typically, depends on ChatGPT response time

**Q: Can I use this without ChatGPT?**
A: Yes, switch to "Template" mode for traditional approach

**Q: Are all 6 generators required?**
A: No, choose the one that fits your need

**Q: Can I edit after auto-fill?**
A: Yes, edit any field before submitting

**Q: Will my changes be saved?**
A: Yes, saved in component state during session

---

**Ready to Generate? Let's Go!** 🎬✨
