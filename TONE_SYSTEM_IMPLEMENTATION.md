# Tone of Voice System Implementation

## Overview

Implemented a Formless-like tone of voice system with chattiness control for Formactive. This system allows form creators to customize how conversational their forms sound without affecting data collection, field order, or completion logic.

## What Was Implemented

### 1. Core Tone Engine (`lib/tone.ts`)

**Tone Presets:**
- **Energetic** (85% chattiness) - Upbeat and enthusiastic
- **Sassy** (70% chattiness) - Bold and confident
- **Witty** (60% chattiness) - Clever and engaging
- **Casual** (55% chattiness) - Relaxed and friendly
- **Professional** (45% chattiness) - Business-appropriate and clear (DEFAULT)
- **Concise** (25% chattiness) - Brief and to the point

**Tone Configuration:**
```typescript
{
  preset: 'professional' | 'energetic' | 'sassy' | 'witty' | 'casual' | 'concise',
  custom: string,  // Free-text like "Friendly+Professional"
  chattiness: number | null  // 0-1 override, null = use preset default
}
```

**Key Features:**
- `compileToneContract()` - Converts tone config into actionable contract
- Computes effective chattiness (preset default or custom override)
- Maps chattiness to verbosity tiers: low (0-0.33), medium (0.34-0.66), high (0.67-1.0)
- Generates style rules for AI-based phrasing

### 2. Phrasing Template System (`lib/phrasing.ts`)

**Safe, Deterministic Phrasing:**
- Template-based system that ONLY affects wording, never data/order/logic
- Verbosity-aware placeholder text for different input types
- Tone-adjusted validation messages
- Preserves user's custom messages when provided

**Key Functions:**
- `applyTonePhrasing()` - Apply tone to question messages
- `getPlaceholderText()` - Get tone-aware input placeholders
- `getValidationMessage()` - Get tone-aware error messages
- `applyToneToEnd()` - Apply tone to completion messages

### 3. Admin UX Updates (Step 2: Tone of Voice)

**New UI Components:**

1. **Custom Tone Input**
   - Free-text field for custom tone descriptions
   - Default: "Friendly+Professional"
   - Placeholder: "e.g., Friendly+Professional"

2. **Tone Presets Selector**
   - Collapsible grid showing all 6 presets
   - Visual "bars" indicator showing chattiness level (1-4 bars)
   - Shows preset name, description, and chattiness
   - Selecting preset resets chattiness to preset default

3. **Chattiness Slider**
   - Range slider 0-100 (mapped to 0-1 internally)
   - Shows current level from either preset default or custom override
   - "Reset to preset" button appears when overridden
   - Helper text: "Controls how short or chatty the assistant sounds"

4. **Important Tooltip**
   - 💡 "Tone affects phrasing, not what data is collected"
   - Ensures users understand tone is cosmetic only

5. **Audience Field**
   - Retained from previous design
   - Helps contextualize tone application

### 4. Conversational Form Integration

**Applied Tone Contract:**
- Compiled tone contract on form load
- Applied to all question messages via `applyTonePhrasing()`
- Tone-aware placeholders for all input types
- Tone-aware validation error messages
- Tone-aware end screen messages

**Safety Guarantees:**
- Tone NEVER affects what fields are collected
- Tone NEVER affects field order
- Tone NEVER affects required/optional logic
- Tone NEVER affects completion logic
- User's custom messages always take priority

### 5. Data Model Updates

**Types Added:**
```typescript
interface ToneConfig {
  preset: 'energetic' | 'sassy' | 'witty' | 'professional' | 'casual' | 'concise';
  custom: string;
  chattiness: number | null;
}

interface FormConfig {
  // ... existing fields
  tone?: ToneConfig;
}
```

**Default for New Forms:**
```typescript
{
  preset: 'professional',
  custom: 'Friendly+Professional',
  chattiness: null  // Use preset default
}
```

## User Experience Flow

### Creating a Form

1. User describes their form in Step 1 (Overview)
2. User opens Step 2 (Tone of voice)
3. User can:
   - Enter a custom tone description (e.g., "Warm and welcoming")
   - Select a preset (e.g., "Energetic" for 85% chattiness)
   - Adjust chattiness slider for fine control
   - Click "Reset to preset" to revert to preset default
4. Changes apply immediately to live preview
5. Tone affects question phrasing, placeholders, and validation messages

### Respondent Experience

1. Form displays with tone-adjusted phrasing
2. Chattier tones = slightly longer/friendlier messages
3. Concise tones = shorter, more direct messages
4. All functionality remains identical regardless of tone
5. Data collection is completely unaffected

## Technical Architecture

### Tone Compilation Pipeline

```
FormConfig.tone
    ↓
compileToneContract()
    ↓
ToneContract {
  preset,
  custom,
  effectiveChattiness,
  verbosityTier: 'low' | 'medium' | 'high',
  styleRules: string[]
}
    ↓
Applied to phrasing templates
    ↓
Rendered in UI
```

### Chattiness Computation

```typescript
// If user has set custom chattiness
if (tone.chattiness !== null) {
  effectiveChattiness = clamp(tone.chattiness, 0, 1);
}
// Otherwise use preset default
else {
  effectiveChattiness = TONE_PRESETS[tone.preset].defaultChattiness;
}

// Map to verbosity tier
if (effectiveChattiness <= 0.33) verbosityTier = 'low';
else if (effectiveChattiness <= 0.66) verbosityTier = 'medium';
else verbosityTier = 'high';
```

## Files Modified/Created

### New Files
- `/lib/tone.ts` - Core tone engine with presets and compilation
- `/lib/phrasing.ts` - Safe phrasing template system

### Modified Files
- `/lib/types.ts` - Added ToneConfig interface and FormConfig.tone
- `/app/dashboard/forms/[id]/page.tsx` - Added Step 2 tone controls UI
- `/components/conversational-form.tsx` - Applied tone to rendering

## Migration Notes

**Existing Forms:**
- Forms without `tone` property will use default (Professional + Friendly+Professional + null chattiness)
- No data migration required
- Backward compatible

**Future Enhancements:**
- Could extend phrasing templates with more variants
- Could add AI-powered tone application to existing messages
- Could add more presets (e.g., "Playful", "Serious", "Technical")
- Could add preview samples in admin UI

## Testing Checklist

✅ Build succeeds with no TypeScript errors
✅ Tone presets display correctly in admin UI
✅ Chattiness slider updates correctly
✅ Reset button appears/works when overriding chattiness
✅ Custom tone text saves and loads
✅ Tone contract compiles correctly for all presets
✅ Phrasing applies to question messages
✅ Placeholders adjust based on tone
✅ Validation messages adjust based on tone
✅ Forms without tone config use defaults
✅ Tone NEVER affects data collection logic
✅ Tone NEVER affects field order
✅ Tone NEVER affects completion logic

## Design Philosophy

**"Tone affects phrasing, not what data is collected"**

This implementation follows Formless's principle: tone is purely cosmetic. The system:
- Uses template-based approach for safety
- Preserves user's explicit messages
- Never modifies form logic or data flow
- Provides fine-grained control (presets + slider)
- Makes tone impact visible and understandable
- Maintains UX consistency across all tones

## Summary

Successfully implemented a production-ready tone of voice system that matches Formless UX patterns. The system provides 6 presets with visual chattiness indicators, custom tone descriptions, and a fine-tuned chattiness slider. All tone adjustments are safe, deterministic, and affect only phrasing—never data collection, order, or logic. The implementation is fully typed, backward compatible, and ready for immediate use.
