// Prosody humanizer for Andrei's TTS — inserts natural micro-pauses and
// expands common abbreviations so ElevenLabs delivery sounds like a real
// Romanian real-estate agent on the phone, not a robotic announcer.
//
// Rules are conservative: only safe transformations that improve cadence
// without changing meaning. Output stays plain text (ElevenLabs reads "..."
// as a short pause, ", " as a comma breath).

const ABBREV: Array<[RegExp, string]> = [
  [/\bmp\b\.?/gi, "metri pătrați"],
  [/\bm²/g, "metri pătrați"],
  [/\bm2\b/gi, "metri pătrați"],
  [/\bnr\.\s*/gi, "numărul "],
  [/\bstr\.\s*/gi, "strada "],
  [/\bbd\.\s*/gi, "bulevardul "],
  [/\bap\.\s*/gi, "apartament "],
  [/\bet\.\s*/gi, "etajul "],
  [/\bsc\.\s*/gi, "scara "],
  [/\bbl\.\s*/gi, "blocul "],
  [/\bdl\.\s*/gi, "domnul "],
  [/\bdna\.\s*/gi, "doamna "],
  [/\bROI\b/g, "R-O-I"],
  [/\bRT-(\d+)/g, "R-T $1"],
  [/(\d+)\s*€/g, "$1 euro"],
  [/€\s*(\d+)/g, "$1 euro"],
  [/(\d+)\s*EUR\b/gi, "$1 euro"],
  [/(\d+)\s*lei\b/gi, "$1 lei"],
  [/(\d+)\s*%/g, "$1 la sută"],
  [/\b(\d+)\s*\/\s*lună\b/gi, "$1 pe lună"],
  [/\b(\d+)\s*\/\s*noapte\b/gi, "$1 pe noapte"],
];

// Conjunctions/transitions where a real agent would breathe before continuing.
const PAUSE_BEFORE = /\b(deci|așadar|practic|în plus|de altfel|prin urmare|apropo|sincer|de fapt)\b/gi;

// Phrases that benefit from a small pause AFTER them (call to attention).
const PAUSE_AFTER = /(\bbună ziua\b|\bbună seara\b|\bsalut\b|\bperfect\b|\bînțeleg\b|\bexcelent\b)([,.\s])/gi;

export function humanizeForTTS(input: string): string {
  if (!input) return input;
  let t = input;

  // 1. Expand abbreviations & symbols
  for (const [re, rep] of ABBREV) t = t.replace(re, rep);

  // 2. Normalize whitespace + collapse multiple punctuation
  t = t.replace(/\s+/g, " ").trim();
  t = t.replace(/\.{4,}/g, "...");

  // 3. Add a soft pause before transition words mid-sentence
  t = t.replace(PAUSE_BEFORE, (m) => `... ${m}`);

  // 4. Add a small pause after greetings/acknowledgements
  t = t.replace(PAUSE_AFTER, (_m, g1, g2) => `${g1}...${g2 === "," || g2 === "." ? g2 : " "}`);

  // 5. Light breathing on long sentences (>140 chars without comma)
  t = t.split(/(?<=[.!?])\s+/).map((sentence) => {
    if (sentence.length > 140 && !/,/.test(sentence)) {
      // insert a single soft pause near the middle, on a word boundary
      const mid = Math.floor(sentence.length / 2);
      const sliceLeft = sentence.slice(0, mid);
      const lastSpace = sliceLeft.lastIndexOf(" ");
      if (lastSpace > 30) {
        return sentence.slice(0, lastSpace) + "," + sentence.slice(lastSpace);
      }
    }
    return sentence;
  }).join(" ");

  // 6. Ensure final punctuation so ElevenLabs closes the prosodic contour
  if (!/[.!?…]$/.test(t)) t = t + ".";

  return t;
}
