// Friendly replies to short greetings, thanks and goodbyes, without searching the policies or calling
// a model. Only messages that are *entirely* small talk match: "Hi, can I return a dress?" is a real
// question and goes through the normal search.

const MAX_WORDS = 6;

/** Lowercase, straight apostrophes, punctuation and emoji removed, single spaces. */
export function normalizeSmallTalk(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// "&" is removed by normalizeSmallTalk, so "Tallow & Pine" arrives as "tallow pine".
const NAME = "(?: there| team| everyone| all| friend| tallow (?:and )?pine)?";

const RULES: { pattern: RegExp; reply: string }[] = [
  {
    pattern: new RegExp(
      `^(?:hi|hello|hey|hiya|heya|howdy|hey hey|greetings|good (?:morning|afternoon|evening|day))${NAME}$`,
    ),
    reply:
      "Hi! I can help with orders, delivery, returns, sizing, payments and more. What would you like to know?",
  },
  {
    pattern:
      /^(?:(?:hi|hello|hey) )?(?:how are you(?: doing)?(?: today)?|how's it going|how are things)$/,
    reply:
      "Doing well, thanks for asking! I can help with orders, delivery, returns, sizing and more. What would you like to know?",
  },
  {
    pattern:
      /^(?:(?:ok|okay|great|perfect|awesome|cool|got it|that helps|that's helpful) )?(?:thanks|thank you|thank you so much|thanks a lot|thanks so much|many thanks|thx|ty|cheers|appreciate it|much appreciated)(?: so much| a lot)?$/,
    reply: "You're welcome! Is there anything else I can help you with?",
  },
  {
    pattern:
      /^(?:bye|goodbye|good bye|bye bye|see you|see ya|see you later|that's all|that is all|no thanks|no thank you|nothing else|i'm good|im good)$/,
    reply: "Happy to help. Have a lovely day!",
  },
  {
    pattern: /^(?:ok|okay|k|cool|great|perfect|awesome|got it|nice|good|alright|sounds good)$/,
    reply: "Glad that helps! Anything else you'd like to know?",
  },
];

/** The reply for a small-talk message, or null if it is a real question. */
export function smallTalkReply(text: string): string | null {
  const normalized = normalizeSmallTalk(text);
  if (!normalized || normalized.split(" ").length > MAX_WORDS) return null;
  return RULES.find((rule) => rule.pattern.test(normalized))?.reply ?? null;
}
