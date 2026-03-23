# Gemini JSON Parsing Fix

**Date:** 2026-02-12
**Issue:** Text Extraction Agent failing to parse Gemini responses
**Status:** ✅ Fixed

## Problem

When testing the Brief Helper feature locally, the text extraction agent failed with:

```
[ERROR] [text-extraction-agent] Failed to parse JSON response
SyntaxError: Unexpected token '`', "```json..." is not valid JSON
```

**Root Cause:** Gemini 2.5 Flash was returning valid JSON but wrapped in markdown code blocks:
```
```json
{
  "bulletPoints": [...],
  "entities": [...]
}
```
```

The agent was trying to parse the raw response including the markdown wrapper, which caused `JSON.parse()` to fail.

## Solution

Updated `agent/agents/brief/text-extraction-agent.ts` (lines 188-209) to strip markdown code blocks before parsing:

```typescript
// Parse JSON response (strip markdown code blocks if present)
let parsed: any;
try {
  // Remove markdown code blocks (```json ... ```)
  let cleanedText = response.text.trim();
  if (cleanedText.startsWith('```')) {
    // Find the first newline after ``` (skips ```json or ```JSON)
    const firstNewline = cleanedText.indexOf('\n');
    if (firstNewline > 0) {
      cleanedText = cleanedText.substring(firstNewline + 1);
    }
    // Remove trailing ```
    if (cleanedText.endsWith('```')) {
      cleanedText = cleanedText.substring(0, cleanedText.lastIndexOf('```'));
    }
    cleanedText = cleanedText.trim();
  }

  parsed = JSON.parse(cleanedText);
} catch (error) {
  // ... error handling
}
```

## Impact

- ✅ Text extraction now works with Gemini 2.5 Flash
- ✅ No fallback to Claude/OpenAI needed (both had quota limits)
- ✅ Compatible with both raw JSON and markdown-wrapped JSON responses
- ✅ More robust parsing for future AI model responses

## Testing

After applying the fix:
1. Navigate to `http://localhost:3000/brief-helper`
2. Enter text in any field (e.g., "What" field)
3. Wait 2.5 seconds for AI extraction
4. Verify bullet points appear without errors
5. Check browser console - no JSON parse errors

## Related Files

- `agent/agents/brief/text-extraction-agent.ts` - Main fix applied here
- `agent/agents/brief/expansion-agent.ts` - Uses text parsing, no changes needed
- `agent/agents/brief/gap-detection-agent.ts` - Pattern-based, no AI calls

## Notes

- Gemini model already configured to use `gemini-2.5-flash` (latest version)
- Other agents (expansion, gap detection) don't use JSON parsing, so no updates needed
- Fix is backward compatible - works with both wrapped and unwrapped JSON
