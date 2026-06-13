/**
 * Federal Register API client — presidential actions (executive orders,
 * memoranda, proclamations, determinations). No API key required.
 * Docs: https://www.federalregister.gov/developers/documentation/api/v1
 */

export interface FrPresidentialAction {
  documentNumber: string;
  eoNumber: number | null;
  /** Display label of the document kind: "Executive Order" | "Memorandum" | "Proclamation" | … */
  subtype: string | null;
  title: string;
  signingDate: string | null;
  abstract: string | null;
  htmlUrl: string | null;
  pdfUrl: string | null;
  presidentName: string | null;
  presidentSlug: string | null;
  topics: string[];
}

const BASE = "https://www.federalregister.gov/api/v1/documents.json";

function mapDoc(d: any): FrPresidentialAction {
  // `president` may be an object { name, identifier } or a bare slug string.
  let presidentName: string | null = null;
  let presidentSlug: string | null = null;
  if (d.president && typeof d.president === "object") {
    presidentName = d.president.name ?? null;
    presidentSlug = d.president.identifier ?? null;
  } else if (typeof d.president === "string") {
    presidentSlug = d.president;
  }
  // `topics` may be an array of strings or of { name } objects.
  const topics: string[] = Array.isArray(d.topics)
    ? d.topics.map((t: any) => (typeof t === "string" ? t : t?.name)).filter(Boolean)
    : [];
  return {
    documentNumber: d.document_number,
    eoNumber: d.executive_order_number ? Number(d.executive_order_number) : null,
    subtype: d.subtype ?? null,
    title: d.title ?? "(untitled presidential action)",
    signingDate: d.signing_date ?? null,
    abstract: d.abstract ?? null,
    htmlUrl: d.html_url ?? null,
    pdfUrl: d.pdf_url ?? null,
    presidentName,
    presidentSlug,
    topics,
  };
}

/**
 * Fetch all presidential actions for a given president (Federal Register slug,
 * e.g. "donald-trump", "joseph-r-biden") — executive orders, memoranda,
 * proclamations, determinations. Paginates until the API is exhausted; a
 * president's document set is finite and modest, so there is no default cap.
 * `max` is an optional safety ceiling (Infinity = unbounded).
 */
export async function fetchPresidentialActions(
  presidentSlug: string,
  max = Infinity,
): Promise<FrPresidentialAction[]> {
  const out: FrPresidentialAction[] = [];
  let page = 1;
  const perPage = 1000;
  while (out.length < max) {
    const params = new URLSearchParams();
    params.append("conditions[type][]", "PRESDOCU");
    params.append("conditions[president][]", presidentSlug);
    params.append("per_page", String(perPage));
    params.append("page", String(page));
    for (const f of [
      "document_number",
      "title",
      "executive_order_number",
      "subtype",
      "signing_date",
      "html_url",
      "pdf_url",
      "abstract",
      "president",
      "topics",
    ]) {
      params.append("fields[]", f);
    }
    const res = await fetch(`${BASE}?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Federal Register API error ${res.status}: ${await res.text()}`);
    }
    const data: any = await res.json();
    const docs: any[] = data.results ?? [];
    for (const d of docs) out.push(mapDoc(d));
    if (!data.next_page_url || docs.length === 0) break;
    page++;
  }
  return Number.isFinite(max) ? out.slice(0, max) : out;
}
