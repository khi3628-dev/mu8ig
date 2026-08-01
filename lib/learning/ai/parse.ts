/**
 * Extract JSON from a Claude response's first text block, stripping code fences
 * or surrounding prose if present.
 */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const first = raw.indexOf("{");
  const firstArr = raw.indexOf("[");
  let start = first;
  if (firstArr !== -1 && (firstArr < first || first === -1)) start = firstArr;
  if (start === -1) throw new Error("No JSON object in response");
  const openChar = raw[start];
  const closeChar = openChar === "{" ? "}" : "]";
  const last = raw.lastIndexOf(closeChar);
  if (last === -1 || last <= start) throw new Error("Malformed JSON");
  return JSON.parse(raw.slice(start, last + 1));
}
