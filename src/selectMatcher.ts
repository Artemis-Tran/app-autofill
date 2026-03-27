const STOP_WORDS = new Set([
  "a",
  "an",
  "am",
  "are",
  "as",
  "be",
  "for",
  "i",
  "is",
  "me",
  "my",
  "of",
  "the",
  "to"
]);

const norm = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

function tokenize(s: string): string[] {
  return norm(s)
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map(token => token.trim())
    .filter(token => token.length > 1 && !STOP_WORDS.has(token));
}

function scoreOptionMatch(value: string, option: string, allowSubstring = true): number {
  const source = norm(value);
  const candidate = norm(option);

  if (!source || !candidate) return Number.NEGATIVE_INFINITY;
  if (source === candidate) return 1000;
  if (allowSubstring && (candidate.includes(source) || source.includes(candidate))) return 700;

  const valueTokens = new Set(tokenize(source));
  const optionTokens = new Set(tokenize(candidate));
  if (!valueTokens.size || !optionTokens.size) return Number.NEGATIVE_INFINITY;

  let shared = 0;
  for (const token of valueTokens) {
    if (optionTokens.has(token)) shared++;
  }

  if (!shared) return Number.NEGATIVE_INFINITY;

  const coverage = shared / valueTokens.size;
  const precision = shared / optionTokens.size;
  return coverage * 100 + precision * 25 + shared * 10;
}

export function findBestSelectOption(
  options: ArrayLike<{ text?: string | null; value?: string | null; disabled?: boolean }>,
  value: string
): { text?: string | null; value?: string | null; disabled?: boolean } | undefined {
  const opts = Array.from(options).filter(option => !option.disabled);
  const exact = opts.find(option =>
    norm(option.value) === norm(value) || norm(option.text) === norm(value)
  );
  if (exact) return exact;

  let best: { option: typeof opts[number]; score: number } | null = null;
  for (const option of opts) {
    const score = Math.max(
      scoreOptionMatch(value, option.text ?? ""),
      scoreOptionMatch(value, option.value ?? "", false)
    );

    if (!best || score > best.score) {
      best = { option, score };
    }
  }

  return best && best.score >= 95 ? best.option : undefined;
}
