// Investor prototype (11 Nov 2026): writes the note and "why" texts (en/az/tr) for the curated looks with
// Gemini, then asks Gemini three more times whether each look suits its weather and whether the texts
// describe exactly the pieces shown. Only looks that pass all three checks are written. Free (Gemini).
// Run like proto-looks.mts:  ... jiti-cli.mjs scripts/fal/proto-texts.mts m1-1 f1-2 ...
import fs from "node:fs";
import path from "node:path";
import { askGemini, GEMINI_WRITING } from "@/lib/wardrobe/server";
import { WRITING } from "@/lib/wardrobe/looks";
import { SAMPLE_NOTES } from "@/lib/wardrobe/catalog";
import { CURATED } from "@/lib/wardrobe/curated";

// Gemini is often busy (503) on the free plan: wait and ask again.
async function patient(parts: Parameters<typeof askGemini>[0], timeout: number, order?: string[]) {
  for (let i = 0; ; i++) {
    try {
      return await askGemini(parts, timeout, order);
    } catch (e) {
      if (i >= 5) throw e;
      await new Promise((r) => setTimeout(r, 8000 * (i + 1)));
    }
  }
}

const FILE = path.join(process.cwd(), "src", "lib", "wardrobe", "curated-texts.json");
const texts = JSON.parse(fs.readFileSync(FILE, "utf8"));
const checkOnly = process.argv.includes("--check"); // check the cards already written (by hand), write nothing new
const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));

const CHECK =
  "You review an outfit card before customers see it. Reply as JSON {\"ok\": boolean, \"problem\": string}. ok is false if: " +
  "(1) the outfit is clearly unsuitable for the stated weather; (2) the colours clash; (3) any text names or implies a piece that is not in the piece list (for example a coat, scarf, shoes or bag that is not listed), " +
  "unless it is advice to wear a coat on top outdoors or to take one along (that is good advice on a cold day, not an error); a shirt or blouse with a warm coat on top is suitable from 7°C; (4) the Azerbaijani (az) or Turkish (tr) text has a grammar or spelling mistake, a wrong word, Cyrillic letters, or uses \"siz\"; (5) the English is unnatural.";

for (const look of CURATED) {
  if (only.length && !only.includes(look.id)) continue;
  const pieces = look.refs.map((r) => SAMPLE_NOTES[r]).join("; ");
  const who = look.avatar.startsWith("m") ? "an adult man" : "an adult woman";
  const weather = `Baku, ${look.date}: between ${look.low}°C and ${look.high}°C during the day.`;
  let accepted = null;
  if (checkOnly) {
    const card = JSON.stringify(texts[look.id]);
    const votes = [];
    for (let v = 0; v < 3; v++) votes.push(await patient([CHECK, `Pieces: ${pieces}. Weather: ${weather}. Card: ${card}`], 45_000).catch(() => null));
    const bad = votes.filter((x) => !x || (x as { ok?: boolean }).ok !== true) as { problem?: string }[];
    console.log(`${look.id} check: ${3 - bad.length}/3 ok ${bad.map((b) => b?.problem ?? "no answer").join(" | ").slice(0, 400)}`);
    continue;
  }
  for (let attempt = 0; attempt < 3 && !accepted; attempt++) {
    const prompt = [
      `You are a personal stylist. Explain this outfit for ${who}. The outfit is exactly these pieces: ${pieces}.`,
      `Weather: ${weather}`,
      "Do not mention any other garment as part of the outfit. When the coldest part of the day is below 15°C, say in \"layers\" that a warm coat goes on top outdoors (it is advice, not part of the outfit).",
      "Turkish (tr) uses only the Turkish alphabet, never the letter ə, and addresses the reader as \"sen\" (for example \"görüneceksin\", never \"görüneceksən\"). In tr a coat is \"kaban\" (never \"kanto\" or \"kanton\"), in az it is \"palto\". Never advise wearing nothing under a shirt.",
      'Reply as JSON: {"note": {"en","az","tr"}, "why": {"weather": {"en","az","tr"}, "harmony": {...}, "layers": {...}}}.',
      WRITING.replace("mention the temperatures", "mention the temperature range"),
    ].join("\n");
    const answer = (await patient([prompt], 60_000, GEMINI_WRITING)) as Record<string, unknown>;
    const card = JSON.stringify(answer);
    if (/[Ѐ-ӿ]/.test(card)) continue;
    const ask = () => patient([CHECK, `Pieces: ${pieces}. Weather: ${weather}. Card: ${card}`], 45_000).then((a) => a as { ok?: boolean; problem?: string }, () => null);
    const votes = [];
    for (let v = 0; v < 3; v++) votes.push(await ask());
    const bad = votes.filter((v) => !v || v.ok !== true);
    console.log(`${look.id} attempt ${attempt + 1}: ${3 - bad.length}/3 ok ${bad.map((b) => b?.problem ?? "no answer").join(" | ").slice(0, 300)}`);
    if (!bad.length) accepted = answer;
  }
  if (accepted) {
    texts[look.id] = accepted;
    fs.writeFileSync(FILE, JSON.stringify(texts, null, 2) + "\n");
  } else console.log(`${look.id}: NOT accepted`);
}
