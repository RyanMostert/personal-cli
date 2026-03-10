import { generateText, type LanguageModel } from 'ai';

const TITLE_PROMPT = `You are a conversation title generator.
Given the first user message and assistant response, generate a short title (3-6 words, no punctuation, title case).
Return ONLY the title text, nothing else. Examples:
- "Fix Auth Bug in Login"
- "Explain React useEffect"
- "Write Python CSV Parser"`;

export async function generateTitle(
  userMessage: string,
  assistantResponse: string,
  model: LanguageModel,
): Promise<string> {
  try {
    const { text } = await generateText({
      model,
      system: TITLE_PROMPT,
      messages: [
        {
          role: 'user',
          content: `User: ${userMessage.slice(0, 200)}\nAssistant: ${assistantResponse.slice(0, 500)}`,
        },
      ],
      maxOutputTokens: 20,
      temperature: 0.3,
    });
    return (
      text
        .trim()
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .trim() || 'Untitled'
    );
  } catch {
    return 'Untitled';
  }
}
