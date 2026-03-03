# Bug: Web-fetch Tool Returns Empty Output

## Problem

When the AI uses the `webFetch` tool, the tool executes successfully but returns empty content. The model does not see the fetched data, so it cannot respond with meaningful information.

### Observed Behavior
- User: "Fetch the latest Steam games"
- AI: Uses webFetch tool ✓ (executes without errors)
- Tool returns: `{ output: "" }` (empty string)
- AI responds: "I couldn't get the content" or no meaningful response

### Expected Behavior
- Tool should return fetched HTML/text content
- AI should summarize or analyze the content
- User gets actual information

---

## Investigation Needed

### 1. Check webFetch tool implementation
**File**: `packages/tools/src/tools/web-fetch.ts`

Possible issues:
- `fetch()` succeeds but returns empty body
- `htmlToText()` function is too aggressive and strips all content
- `content-type` detection is incorrect
- Response parsing fails silently
- Output is being truncated to empty

### 2. Debug the htmlToText function (lines 6-18)

Current implementation:
```typescript
function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
```

**Suspect**: The `.replace(/\s{2,}/g, ' ')` might collapse entire pages to a single line if they're pre-formatted, or the chain of replacements might eliminate text content.

### 3. Test manually
```bash
curl -I https://store.steampowered.com/search
curl https://store.steampowered.com/search 2>/dev/null | head -100
```

Check:
- Does the endpoint return data?
- Is it HTML, JSON, or something else?
- Is there CORS blocking?

### 4. Check AbortSignal timeout
**Line 36**: `signal: AbortSignal.timeout(15_000)` — might be too short for slow sites

---

## Root Causes to Check

| Cause | File | How to Fix |
|-------|------|-----------|
| htmlToText too aggressive | `web-fetch.ts:6-18` | Log raw HTML, add selective text extraction instead of all-removing regex |
| fetch() body is empty | `web-fetch.ts:34-42` | Add error handling for empty responses |
| Content-Type logic wrong | `web-fetch.ts:41-43` | Log actual header, handle more content types |
| Timeout too short | `web-fetch.ts:36` | Increase to 30s or make configurable |
| Steam Games endpoint blocked/JS-rendered | Network | Steam Games page likely uses JS, might need different API |

---

## Root Cause (confirmed)

Line 16 of the original `htmlToText`:
```typescript
.replace(/\s{2,}/g, ' ')   // BUG: \s matches \n, so ALL newlines were collapsed to spaces
.replace(/\n{3,}/g, '\n\n') // dead code — no newlines survived the line above
```

After stripping `<script>` and all tags, a JS-heavy page like Steam has almost no remaining text — just scattered whitespace. The `\s{2,}` regex collapsed it all to a single space, which `.trim()` reduced to `""`.

## Fix Applied (`packages/tools/src/tools/web-fetch.ts`)

1. `htmlToText`: convert block elements to `\n` before stripping tags; use `[ \t]{2,}` (not `\s{2,}`) to collapse only horizontal whitespace; added `&#\d+;` entity stripping.
2. JS-rendered fallback: if HTML page yields < 200 chars of text, return a message explaining the page is JS-rendered so the AI understands why there's no content.

## Progress Checklist

- [x] Identify which regex is causing content loss — `\s{2,}` on line 16 collapsed newlines
- [x] Fix htmlToText function
- [x] Add JS-rendered page fallback
- [x] Build and verify clean
