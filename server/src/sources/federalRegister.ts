/**
 * Federal Register API client — executive orders. No API key required.
 * Docs: https://www.federalregister.gov/developers/documentation/api/v1
 */

export interface FrExecutiveOrder {
  documentNumber: string;
  eoNumber: number | null;
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

function mapDoc(d: any): FrExecutiveOrder {
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
    title: d.title ?? "(untitled executive order)",
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
 * Fetch executive orders for a given president (Federal Register slug,
 * e.g. "donald-trump", "joseph-r-biden"). Paginates up to `max`.
 */
export async function fetchExecutiveOrders(
  presidentSlug: string,
  max = 500,
): Promise<FrExecutiveOrder[]> {
  const out: FrExecutiveOrder[] = [];
  let page = 1;
  const perPage = 1000;
  while (out.length < max) {
    const params = new URLSearchParams();
    params.append("conditions[type][]", "PRESDOCU");
    params.append("conditions[presidential_document_type][]", "executive_order");
    params.append("conditions[president][]", presidentSlug);
    params.append("per_page", String(perPage));
    params.append("page", String(page));
    for (const f of [
      "document_number",
      "title",
      "executive_order_number",
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
  return out.slice(0, max);
}
