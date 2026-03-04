export const COMPACTION_PROMPT = `Your task is to create a detailed summary of the conversation so far.
This summary will replace the full conversation history, so it must preserve everything important:

- All decisions made and why
- All code written, edited, or discussed (include key function names, file paths)
- Current state of any ongoing task
- Files that were read or modified
- Any errors encountered and how they were resolved
- User preferences and instructions given
- What was asked for vs what was delivered

Format: Write in past tense, first person plural ("We discussed...", "The user asked...").
Be comprehensive — it's better to include too much than too little.
Target length: 300-600 words.`;
