/**
 * SSE client for the backend's `POST /deal-desk/stream` endpoint.
 *
 * The endpoint POSTs a multipart form, so EventSource (GET-only) won't
 * work. We use plain `fetch` and parse the `text/event-stream` response
 * body chunk-by-chunk via a ReadableStream reader.
 *
 * Types mirror the backend's StepEvent / Offer Pydantic schemas.
 */

export type WeightClass = "light" | "medium" | "heavy";
export type Timestep = "monthly" | "quarterly" | "yearly";
export type FlexibilityPriority = "low" | "medium" | "high";
export type CashFlowProfile = "fixed" | "volume_coupled";

export type StepEvent = {
  turn: number;
  name: string;
  args: Record<string, unknown>;
  result_jsonable: unknown | null;
  error: string | null;
};

export type OfferHeader = {
  customer_name: string;
  robot_chosen: string;
  fleet_size: number;
  term_months: number;
};

export type OfferPricing = {
  base_fee_monthly_eur: number;
  eur_per_pick_min: number;
  eur_per_pick_median: number;
  eur_per_pick_max: number;
  expected_monthly_eur: number;
  peak_monthly_eur: number;
};

export type Scenario = {
  label: string;
  eur_per_pick: number;
  delta_vs_base_pct: number;
  note: string;
};

export type ClauseSuggestion = {
  name: string;
  reasoning: string;
};

export type OfferComparison = {
  leasing_total_eur: number;
  unifi_base_fee_total_eur: number;
  unifi_pay_per_pick_total_eur: number;
  unifi_total_eur: number;
  cash_flow_narrative: string;
  risk_narrative: string;
};

export type Offer = {
  header: OfferHeader;
  pricing: OfferPricing;
  scenarios: Scenario[];
  clauses: ClauseSuggestion[];
  comparison: OfferComparison;
  narrative: string;
};

export type StreamMessage =
  | { type: "connecting" }
  | { type: "step"; event: StepEvent }
  | { type: "offer"; offer: Offer }
  | { type: "done" }
  | { type: "error"; message: string };

const API_BASE_URL =
  process.env.NEXT_PUBLIC_UNIFI_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:8000";

/**
 * POST a PDF to the stream endpoint and yield each parsed message as it
 * arrives. The async generator completes when the server closes the
 * connection.
 */
export async function* runDealDeskStream(
  pdf: File,
): AsyncGenerator<StreamMessage> {
  const formData = new FormData();
  formData.append("pdf", pdf);

  const response = await fetch(`${API_BASE_URL}/deal-desk/stream`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`stream HTTP ${response.status}: ${errorBody}`);
  }
  if (!response.body) {
    throw new Error("stream response has no body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });

    // Split on the SSE record terminator (\n\n). The last segment may be a
    // partial record; keep it in the buffer for the next iteration.
    let recordEnd = buffer.indexOf("\n\n");
    while (recordEnd !== -1) {
      const record = buffer.slice(0, recordEnd);
      buffer = buffer.slice(recordEnd + 2);
      const parsed = parseSseRecord(record);
      if (parsed) {
        yield parsed;
      }
      recordEnd = buffer.indexOf("\n\n");
    }
  }

  // Flush any trailing record without a terminator (rare but defensive).
  if (buffer.trim()) {
    const parsed = parseSseRecord(buffer);
    if (parsed) {
      yield parsed;
    }
  }
}

function parseSseRecord(record: string): StreamMessage | null {
  const dataLines: string[] = [];
  for (const line of record.split("\n")) {
    if (line.startsWith("data: ")) {
      dataLines.push(line.slice(6));
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5));
    }
  }
  if (dataLines.length === 0) {
    return null;
  }
  const payload = dataLines.join("\n");
  try {
    return JSON.parse(payload) as StreamMessage;
  } catch {
    return null;
  }
}
