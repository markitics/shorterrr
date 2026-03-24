/**
 * Hemingway-style writing analysis — all client-side, no API calls.
 *
 * Inspired by hemingwayapp.com's approach:
 * - Readability grade (Automated Readability Index)
 * - Hard / very hard to read sentences
 * - Adverb detection
 * - Passive voice detection
 * - Complex words with simpler alternatives
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface HemingwayResult {
  grade: number;
  stats: {
    words: number;
    sentences: number;
    paragraphs: number;
    characters: number;
  };
  sentences: SentenceAnalysis[];
  summary: {
    hardSentences: number;
    veryHardSentences: number;
    adverbs: number;
    passiveVoice: number;
    complexWords: number;
  };
}

export interface SentenceAnalysis {
  text: string;
  wordCount: number;
  level: "ok" | "hard" | "very-hard";
  issues: Issue[];
}

export interface Issue {
  type: "adverb" | "passive" | "complex";
  word: string;
  suggestion?: string;
  index: number; // character offset within sentence
}

/* ------------------------------------------------------------------ */
/*  Complex word alternatives                                          */
/* ------------------------------------------------------------------ */

const COMPLEX_WORDS: Record<string, string> = {
  "utilize": "use",
  "utilization": "use",
  "implement": "do",
  "implementation": "setup",
  "facilitate": "help",
  "commence": "start",
  "terminate": "end",
  "subsequently": "then",
  "nevertheless": "still",
  "furthermore": "also",
  "additionally": "also",
  "approximately": "about",
  "consequently": "so",
  "demonstrate": "show",
  "endeavor": "try",
  "establish": "set up",
  "regarding": "about",
  "concerning": "about",
  "assistance": "help",
  "sufficient": "enough",
  "insufficient": "not enough",
  "numerous": "many",
  "purchase": "buy",
  "indicate": "show",
  "obtain": "get",
  "provide": "give",
  "require": "need",
  "requirement": "need",
  "requirements": "needs",
  "attempt": "try",
  "modify": "change",
  "modification": "change",
  "modifications": "changes",
  "accomplish": "do",
  "accumulate": "gather",
  "aggregate": "total",
  "allocate": "assign",
  "anticipate": "expect",
  "ascertain": "find out",
  "compensate": "pay",
  "component": "part",
  "components": "parts",
  "considerable": "big",
  "consolidate": "combine",
  "construct": "build",
  "collaborate": "work together",
  "delineate": "outline",
  "determine": "find",
  "disseminate": "spread",
  "eliminate": "cut",
  "equivalent": "equal",
  "expedite": "speed up",
  "formulate": "plan",
  "generate": "make",
  "incentivize": "motivate",
  "incorporate": "include",
  "initiate": "start",
  "leverage": "use",
  "maintain": "keep",
  "methodology": "method",
  "optimize": "improve",
  "paradigm": "model",
  "parameter": "limit",
  "participate": "join",
  "pertaining": "about",
  "prioritize": "rank",
  "procure": "get",
  "proficiency": "skill",
  "proximity": "near",
  "remainder": "rest",
  "remediate": "fix",
  "substantiate": "prove",
  "supplement": "add to",
  "transformation": "change",
  "transparent": "clear",
  "transmit": "send",
  "ultimately": "in the end",
  "validate": "check",
};

/* ------------------------------------------------------------------ */
/*  Adverb detection                                                   */
/* ------------------------------------------------------------------ */

// Common -ly words that are NOT adverbs (false positives to skip)
const NOT_ADVERBS = new Set([
  "apply", "reply", "supply", "fly", "rely", "ally", "bully", "comply",
  "family", "only", "early", "daily", "weekly", "monthly", "yearly",
  "holy", "ugly", "lonely", "lovely", "friendly", "likely", "unlikely",
  "silly", "belly", "jolly", "rally", "tally", "jelly", "hilly",
  "billy", "lily", "curly", "july", "italy", "assembly", "butterfly",
]);

function isAdverb(word: string): boolean {
  const lower = word.toLowerCase();
  if (lower.length < 4) return false;
  if (!lower.endsWith("ly")) return false;
  if (NOT_ADVERBS.has(lower)) return false;
  return true;
}

/* ------------------------------------------------------------------ */
/*  Passive voice detection                                            */
/* ------------------------------------------------------------------ */

const BE_FORMS = new Set([
  "am", "is", "are", "was", "were", "be", "been", "being",
]);

/**
 * Detect passive voice: form of "be" + past participle.
 * Returns array of passive phrases found.
 */
function findPassiveVoice(words: string[]): string[] {
  const passives: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    const word = words[i].toLowerCase().replace(/[^a-z]/g, "");
    if (BE_FORMS.has(word)) {
      const next = words[i + 1].toLowerCase().replace(/[^a-z]/g, "");
      // Past participle heuristic: ends in -ed, -en, -t (for irregular)
      if (
        next.endsWith("ed") ||
        next.endsWith("en") ||
        // Common irregular past participles
        ["made", "done", "given", "taken", "shown", "known", "gone",
         "seen", "told", "found", "thought", "brought", "bought",
         "caught", "taught", "sent", "spent", "built", "left",
         "lost", "felt", "kept", "held", "meant", "met", "paid",
         "put", "read", "run", "said", "set", "sat", "stood",
         "understood", "won", "written", "worn", "torn", "born",
         "chosen", "driven", "eaten", "fallen", "forgotten",
         "frozen", "hidden", "ridden", "spoken", "stolen", "swum",
         "woken"].includes(next)
      ) {
        passives.push(`${words[i]} ${words[i + 1]}`);
      }
    }
  }
  return passives;
}

/* ------------------------------------------------------------------ */
/*  Sentence splitting                                                 */
/* ------------------------------------------------------------------ */

function splitSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by space or end
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function countWords(text: string): number {
  const words = text.trim().split(/\s+/);
  return words[0] === "" ? 0 : words.length;
}

function getWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

/* ------------------------------------------------------------------ */
/*  Readability: Automated Readability Index                           */
/* ------------------------------------------------------------------ */

function countCharacters(text: string): number {
  return text.replace(/[^a-zA-Z0-9]/g, "").length;
}

function automatedReadabilityIndex(
  characters: number,
  words: number,
  sentences: number
): number {
  if (words === 0 || sentences === 0) return 0;
  const ari =
    4.71 * (characters / words) + 0.5 * (words / sentences) - 21.43;
  return Math.max(0, Math.round(ari));
}

/* ------------------------------------------------------------------ */
/*  Main analysis                                                      */
/* ------------------------------------------------------------------ */

// Thresholds (inspired by Hemingway App)
const HARD_SENTENCE_WORDS = 14;
const VERY_HARD_SENTENCE_WORDS = 20;

export function analyze(text: string): HemingwayResult {
  if (!text.trim()) {
    return {
      grade: 0,
      stats: { words: 0, sentences: 0, paragraphs: 0, characters: 0 },
      sentences: [],
      summary: {
        hardSentences: 0,
        veryHardSentences: 0,
        adverbs: 0,
        passiveVoice: 0,
        complexWords: 0,
      },
    };
  }

  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const allSentences = splitSentences(text);
  const totalWords = countWords(text);
  const totalChars = countCharacters(text);

  let totalAdverbs = 0;
  let totalPassive = 0;
  let totalComplex = 0;
  let hardSentences = 0;
  let veryHardSentences = 0;

  const sentenceAnalyses: SentenceAnalysis[] = allSentences.map((sentence) => {
    const words = getWords(sentence);
    const wc = words.length;
    const issues: Issue[] = [];

    // Check adverbs
    words.forEach((w) => {
      const clean = w.replace(/[^a-zA-Z]/g, "");
      if (isAdverb(clean)) {
        issues.push({
          type: "adverb",
          word: clean,
          index: sentence.indexOf(w),
        });
        totalAdverbs++;
      }
    });

    // Check passive voice
    const passives = findPassiveVoice(words);
    passives.forEach((phrase) => {
      issues.push({
        type: "passive",
        word: phrase,
        index: sentence.toLowerCase().indexOf(phrase.toLowerCase()),
      });
      totalPassive++;
    });

    // Check complex words
    words.forEach((w) => {
      const clean = w.replace(/[^a-zA-Z]/g, "").toLowerCase();
      if (COMPLEX_WORDS[clean]) {
        issues.push({
          type: "complex",
          word: clean,
          suggestion: COMPLEX_WORDS[clean],
          index: sentence.toLowerCase().indexOf(clean),
        });
        totalComplex++;
      }
    });

    // Sentence difficulty
    let level: SentenceAnalysis["level"] = "ok";
    if (wc >= VERY_HARD_SENTENCE_WORDS) {
      level = "very-hard";
      veryHardSentences++;
    } else if (wc >= HARD_SENTENCE_WORDS) {
      level = "hard";
      hardSentences++;
    }

    return { text: sentence, wordCount: wc, level, issues };
  });

  const grade = automatedReadabilityIndex(
    totalChars,
    totalWords,
    allSentences.length
  );

  return {
    grade,
    stats: {
      words: totalWords,
      sentences: allSentences.length,
      paragraphs: paragraphs.length,
      characters: totalChars,
    },
    sentences: sentenceAnalyses,
    summary: {
      hardSentences,
      veryHardSentences,
      adverbs: totalAdverbs,
      passiveVoice: totalPassive,
      complexWords: totalComplex,
    },
  };
}
