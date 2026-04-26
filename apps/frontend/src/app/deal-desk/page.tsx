"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  Plus,
  Settings,
  Upload,
} from "lucide-react";
import {
  runDealDeskStream,
  type Offer,
  type StepEvent,
} from "@/lib/dealDeskStream";
import {
  appendFleetRobot,
  buildFleetEntryFromOffer,
} from "@/lib/fleetStorage";
import { RobotThumbnail } from "@/components/robot-scene/RobotThumbnail";

type RunStatus = "idle" | "uploading" | "streaming" | "done" | "error";

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatEur(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatEurFine(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value);
}

export default function DealDeskPage() {
  const router = useRouter();

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [steps, setSteps] = useState<StepEvent[]>([]);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [status, setStatus] = useState<RunStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const traceContainerRef = useRef<HTMLDivElement | null>(null);
  const traceBottomRef = useRef<HTMLDivElement | null>(null);
  const offerSectionRef = useRef<HTMLElement | null>(null);

  // Inner trace container auto-scroll. Use direct `scrollTop` instead of
  // `scrollIntoView` so the scroll does not bubble up to the window —
  // otherwise the whole page would jump every time a new step lands.
  useEffect(() => {
    const container = traceContainerRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceFromBottom < 80) {
      container.scrollTop = container.scrollHeight;
    }
  }, [steps.length, offer]);

  // While the agent is running, keep the window pinned to the bottom so
  // the trace panel stays in view as new tool cards arrive. We snap
  // (instant) instead of smooth-scrolling — smooth pulses look worse
  // when steps stream in quick succession.
  useEffect(() => {
    if (status !== "uploading" && status !== "streaming") return;
    if (offer !== null) return; // hand-off to offer-scroll logic
    window.scrollTo({ top: document.documentElement.scrollHeight });
  }, [status, steps.length, offer]);

  // When the agent finishes, smooth-scroll the page so the offer
  // dashboard slides into view.
  useEffect(() => {
    if (offer !== null) {
      offerSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [offer]);

  const handleAddToFleet = useCallback(() => {
    if (!offer) return;
    appendFleetRobot(buildFleetEntryFromOffer(offer));
    router.push("/robots");
  }, [offer, router]);

  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setErrorMessage(`Expected a PDF, got ${file.name}`);
      return;
    }
    setPdfFile(file);
    setSteps([]);
    setOffer(null);
    setStatus("idle");
    setErrorMessage(null);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDraggingOver(false);
      const file = event.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDraggingOver(false);
  }, []);

  const handleFilePicker = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleRun = useCallback(async () => {
    if (!pdfFile) return;
    setSteps([]);
    setOffer(null);
    setErrorMessage(null);
    setStatus("uploading");
    try {
      let receivedFirstEvent = false;
      for await (const message of runDealDeskStream(pdfFile)) {
        if (message.type === "connecting") {
          if (!receivedFirstEvent) setStatus("streaming");
        } else if (message.type === "step") {
          receivedFirstEvent = true;
          setStatus("streaming");
          setSteps((prev) => [...prev, message.event]);
        } else if (message.type === "offer") {
          setOffer(message.offer);
        } else if (message.type === "done") {
          setStatus("done");
        } else if (message.type === "error") {
          setErrorMessage(message.message);
          setStatus("error");
        }
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setErrorMessage(message);
      setStatus("error");
    }
  }, [pdfFile]);

  const handleDownloadOffer = useCallback(() => {
    if (!offer) return;
    const blob = new Blob([JSON.stringify(offer, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `offer_${offer.header.customer_name.replace(/\W+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [offer]);

  const isRunning = status === "uploading" || status === "streaming";
  const showOffer = offer !== null && status !== "error";

  const statusLabel = useMemo(() => {
    if (status === "uploading") return "Uploading inquiry…";
    if (status === "streaming") return "Agent is reasoning…";
    if (status === "done") return "Offer ready";
    if (status === "error") return "Run failed";
    return "Idle";
  }, [status]);

  return (
    <div className="min-h-screen w-full p-3 font-sans text-[var(--unifi-ink)] lg:p-5">
      <main className="technical-blueprint technical-paper relative flex min-h-[calc(100vh-1.5rem)] w-full flex-col border border-blue-500/20 bg-[#f7f5ef]/80 shadow-[0_24px_90px_rgba(23,32,51,0.10)] lg:min-h-[calc(100vh-2.5rem)]">
        <header className="z-10 flex h-16 shrink-0 items-center justify-between border-b border-blue-500/15 bg-[#f7f5ef]/70 px-4 backdrop-blur-md lg:px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="h-3 w-3 skew-x-[-18deg] bg-blue-600" />
              <span className="text-xl font-bold tracking-[0.18em] text-[var(--unifi-ink)]">
                UNIFI
              </span>
            </Link>
            <div className="hidden h-8 w-px bg-blue-500/20 sm:block" />
            <p className="hidden text-[10px] font-semibold uppercase leading-4 tracking-[0.18em] text-slate-500 sm:block">
              Financial Layer
              <br />
              for RaaS
            </p>
          </div>

          <div className="hidden flex-1 md:block" />

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 border border-blue-500/30 bg-white/45 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700 transition hover:bg-blue-50"
            >
              Live Demo
            </Link>
            <Link
              href="/robots"
              className="inline-flex items-center gap-2 border border-blue-500/30 bg-white/45 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700 transition hover:bg-blue-50"
            >
              Robots
            </Link>
            <span className="inline-flex items-center gap-2 border border-blue-500/30 bg-blue-50 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">
              Deal Desk
            </span>
            <button
              type="button"
              className="grid h-9 w-9 place-items-center border border-blue-500/20 bg-white/45 text-slate-600 transition hover:text-blue-600"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        <section className="z-10 mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 lg:p-6">
          <header className="panel-glass border border-blue-500/15 p-5 lg:p-6">
            <p className="micro-label text-blue-700/80">Pay-per-Pick Workflow</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-[var(--unifi-ink)] lg:text-3xl">
              Deal-Desk-Agent
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Drop your customer&apos;s inquiry. The UNIFI Deal-Desk-Agent extracts the brief,
              picks the right robot, prices the workload against live wear-rate data, and
              drafts a Pay-per-Pick offer ready to share with their CFO.
            </p>
          </header>

          <DropZone
            file={pdfFile}
            isDraggingOver={isDraggingOver}
            isRunning={isRunning}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onFilePick={handleFilePicker}
            onRun={handleRun}
            statusLabel={statusLabel}
            status={status}
            errorMessage={errorMessage}
          />

          <TracePanel
            steps={steps}
            status={status}
            containerRef={traceContainerRef}
            bottomRef={traceBottomRef}
          />

          <DoneIndicator status={status} />

          {showOffer && offer && (
            <OfferDashboard
              offer={offer}
              onDownload={handleDownloadOffer}
              onAddToFleet={handleAddToFleet}
              sectionRef={offerSectionRef}
            />
          )}
        </section>
      </main>
    </div>
  );
}

type DropZoneProps = {
  file: File | null;
  isDraggingOver: boolean;
  isRunning: boolean;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onFilePick: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRun: () => void;
  statusLabel: string;
  status: RunStatus;
  errorMessage: string | null;
};

function DropZone({
  file,
  isDraggingOver,
  isRunning,
  onDrop,
  onDragOver,
  onDragLeave,
  onFilePick,
  onRun,
  statusLabel,
  status,
  errorMessage,
}: DropZoneProps) {
  const inputId = "deal-desk-pdf-input";
  return (
    <section className="panel-glass border border-blue-500/15 p-5 lg:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <p className="micro-label text-blue-700/80">Inquiry Upload</p>
        <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-slate-500">
          {statusLabel}
        </p>
      </div>

      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`mt-3 flex flex-col items-center justify-center gap-3 border border-dashed px-4 py-10 text-center transition ${
          isDraggingOver
            ? "border-blue-500 bg-blue-50/50"
            : "border-blue-500/30 bg-white/40"
        }`}
      >
        <Upload className="h-7 w-7 text-blue-600" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[var(--unifi-ink)]">
            {file ? file.name : "Drop a customer inquiry PDF"}
          </p>
          <p className="text-xs text-slate-500">
            {file
              ? `${formatBytes(file.size)} · ready to run`
              : "or click to choose a file (.pdf)"}
          </p>
        </div>
        <label
          htmlFor={inputId}
          className="cursor-pointer border border-blue-500/30 bg-white/45 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700 transition hover:bg-blue-50"
        >
          Choose file
        </label>
        <input
          id={inputId}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={onFilePick}
        />
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          disabled={!file || isRunning}
          onClick={onRun}
          className="inline-flex items-center justify-center gap-2 border border-blue-600 bg-blue-600 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:border-blue-300 disabled:bg-blue-300"
        >
          {isRunning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {isRunning ? "Running…" : "Run agent"}
        </button>
      </div>

      {errorMessage && status === "error" && (
        <div className="mt-3 flex items-start gap-2 border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <pre className="whitespace-pre-wrap font-mono text-[11px]">{errorMessage}</pre>
        </div>
      )}
    </section>
  );
}

type TracePanelProps = {
  steps: StepEvent[];
  status: RunStatus;
  containerRef: React.RefObject<HTMLDivElement | null>;
  bottomRef: React.RefObject<HTMLDivElement | null>;
};

function TracePanel({ steps, status, containerRef, bottomRef }: TracePanelProps) {
  const isRunning = status === "uploading" || status === "streaming";
  return (
    <section className="panel-glass border border-blue-500/15 p-5 lg:p-6">
      <div className="flex items-baseline justify-between">
        <p className="micro-label text-blue-700/80">Agent Trace</p>
        <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-slate-500">
          {steps.length} step{steps.length === 1 ? "" : "s"}
        </p>
      </div>

      <div
        ref={containerRef}
        className="mt-3 max-h-[460px] overflow-y-auto border border-blue-500/15 bg-white/40 p-3"
      >
        {steps.length === 0 && status === "idle" && (
          <p className="text-xs text-slate-500">
            Upload an inquiry to start the agent.
          </p>
        )}
        {steps.length === 0 && isRunning && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Reading the PDF and extracting the brief…
          </div>
        )}
        {steps.map((step) => (
          <TraceRow key={`${step.turn}-${step.name}`} step={step} />
        ))}
        {isRunning && steps.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            …reasoning
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </section>
  );
}

function TraceRow({ step }: { step: StepEvent }) {
  const hasError = step.error !== null;
  const [expanded, setExpanded] = useState(hasError);
  const argsText = formatJson(step.args);
  const resultText = hasError
    ? step.error ?? ""
    : formatJson(step.result_jsonable);
  const hasArgs = Object.keys(step.args).length > 0;

  return (
    <article
      className={`mb-2 overflow-hidden border-l-2 text-xs transition ${
        hasError
          ? "border-red-400 bg-red-50/60"
          : "border-blue-500/40 bg-white/60 hover:bg-white/80"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
        aria-expanded={expanded}
      >
        {hasError ? (
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden="true" />
        )}
        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-slate-500">
          Step {step.turn}
        </span>
        <span className="flex-1 truncate font-mono text-[12px] font-semibold text-[var(--unifi-ink)]">
          {step.name}
        </span>
        {hasError && (
          <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-red-500">
            error
          </span>
        )}
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-blue-500/10 bg-white/50 px-3 py-2">
          {hasArgs && (
            <div>
              <p className="micro-label text-slate-500">args</p>
              <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-slate-700">
                {argsText}
              </pre>
            </div>
          )}
          <div className={hasArgs ? "mt-3" : ""}>
            <p className="micro-label text-slate-500">{hasError ? "error" : "result"}</p>
            <pre
              className={`mt-1 whitespace-pre-wrap break-words font-mono text-[11px] leading-5 ${
                hasError ? "text-red-700" : "text-slate-700"
              }`}
            >
              {resultText}
            </pre>
          </div>
        </div>
      )}
    </article>
  );
}

function DoneIndicator({ status }: { status: RunStatus }) {
  if (status === "idle") return null;
  if (status === "error") return null;

  const isDone = status === "done";
  return (
    <section className="panel-glass flex items-center gap-3 border border-blue-500/15 px-5 py-3 lg:px-6">
      {isDone ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
      ) : (
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" aria-hidden="true" />
      )}
      <div>
        <p className="micro-label text-slate-500">
          {isDone ? "Run complete" : "Generating offer"}
        </p>
        <p className="text-sm font-semibold text-[var(--unifi-ink)]">
          {isDone
            ? "Offer ready below."
            : "Streaming agent decisions — offer will appear when the run completes."}
        </p>
      </div>
    </section>
  );
}

function OfferDashboard({
  offer,
  onDownload,
  onAddToFleet,
  sectionRef,
}: {
  offer: Offer;
  onDownload: () => void;
  onAddToFleet: () => void;
  sectionRef: React.RefObject<HTMLElement | null>;
}) {
  return (
    <section
      ref={sectionRef}
      className="panel-glass border border-blue-500/15 p-5 lg:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onAddToFleet}
            className="inline-flex items-center justify-center gap-2 border border-blue-600 bg-blue-600 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white transition hover:bg-blue-700"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add to Fleet
          </button>
          <div>
            <p className="micro-label text-blue-700/80">Generated Offer</p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-[var(--unifi-ink)]">
              {offer.header.customer_name}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-2 border border-blue-500/30 bg-white/45 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700 transition hover:bg-blue-50"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Download JSON
          </button>
          <div
            className="relative h-20 w-28 shrink-0 overflow-hidden border border-blue-500/15"
            style={{
              background:
                "radial-gradient(circle at 20% 18%, rgba(31,85,255,0.18), transparent 6rem), linear-gradient(135deg, rgba(255,255,255,0.85), rgba(31,85,255,0.06))",
            }}
          >
            <RobotThumbnail theme="white" className="h-full w-full" />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCell label="Robot" value={offer.header.robot_chosen} />
        <KpiCell label="Fleet" value={`${offer.header.fleet_size} units`} />
        <KpiCell label="Term" value={`${offer.header.term_months} mo`} />
        <KpiCell
          label="€ / pick (median)"
          value={formatEurFine(offer.pricing.eur_per_pick_median)}
        />
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <div className="border border-blue-500/15 bg-white/55 p-4">
          <p className="micro-label text-slate-500">Pricing</p>
          <dl className="mt-2 space-y-1 text-xs text-slate-600">
            <div className="flex justify-between">
              <dt>Base fee (fixed)</dt>
              <dd className="font-mono">{formatEur(offer.pricing.base_fee_monthly_eur)} / mo</dd>
            </div>
            <div className="flex justify-between">
              <dt>Pay-per-pick (variable)</dt>
              <dd className="font-mono">
                {formatEurFine(offer.pricing.eur_per_pick_min)} – {formatEurFine(offer.pricing.eur_per_pick_max)}
              </dd>
            </div>
          </dl>
          <dl className="mt-3 space-y-1 border-t border-blue-500/10 pt-3 text-xs text-slate-600">
            <div className="flex justify-between">
              <dt>Expected monthly (base + variable)</dt>
              <dd className="font-mono">{formatEur(offer.pricing.expected_monthly_eur)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Peak monthly</dt>
              <dd className="font-mono">{formatEur(offer.pricing.peak_monthly_eur)}</dd>
            </div>
          </dl>
        </div>

        <div className="border border-blue-500/15 bg-white/55 p-4">
          <p className="micro-label text-slate-500">Comparison vs. classical leasing</p>
          <dl className="mt-3 space-y-1 text-xs text-slate-600">
            <div className="flex justify-between">
              <dt>Leasing total</dt>
              <dd className="font-mono">{formatEur(offer.comparison.leasing_total_eur)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>UNIFI base fee total</dt>
              <dd className="font-mono">{formatEur(offer.comparison.unifi_base_fee_total_eur)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>UNIFI pay-per-pick total</dt>
              <dd className="font-mono">{formatEur(offer.comparison.unifi_pay_per_pick_total_eur)}</dd>
            </div>
            <div className="flex justify-between border-t border-blue-500/10 pt-1 font-semibold">
              <dt>UNIFI total</dt>
              <dd className="font-mono">{formatEur(offer.comparison.unifi_total_eur)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-5 text-slate-700">
            <span className="micro-label text-slate-500">Cash flow</span>
            <br />
            {offer.comparison.cash_flow_narrative}
          </p>
          <p className="mt-3 text-xs leading-5 text-slate-700">
            <span className="micro-label text-slate-500">Risk</span>
            <br />
            {offer.comparison.risk_narrative}
          </p>
        </div>
      </div>

      {offer.scenarios.length > 0 && (
        <div className="mt-5">
          <p className="micro-label text-slate-500">Scenarios</p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {offer.scenarios.map((scenario, idx) => (
              <li
                key={`${scenario.label}-${idx}`}
                className="border border-blue-500/15 bg-white/55 p-3 text-xs"
              >
                <p className="font-semibold text-[var(--unifi-ink)]">{scenario.label}</p>
                <p className="mt-1 font-mono text-[11px] text-blue-700">
                  {formatEurFine(scenario.eur_per_pick)}{" "}
                  <span className="text-slate-500">
                    ({scenario.delta_vs_base_pct >= 0 ? "+" : ""}
                    {scenario.delta_vs_base_pct.toFixed(1)}% vs base)
                  </span>
                </p>
                {scenario.note && (
                  <p className="mt-2 text-slate-600">{scenario.note}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {offer.clauses.length > 0 && (
        <div className="mt-5">
          <p className="micro-label text-slate-500">Suggested clauses</p>
          <ul className="mt-2 space-y-2">
            {offer.clauses.map((clause, idx) => (
              <li
                key={`${clause.name}-${idx}`}
                className="border-l-2 border-blue-500/40 bg-white/55 px-3 py-2 text-xs"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-blue-700">
                  {clause.name}
                </p>
                <p className="mt-1 text-slate-700">{clause.reasoning}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 border-t border-blue-500/15 pt-4">
        <p className="micro-label text-slate-500">Narrative</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">{offer.narrative}</p>
      </div>
    </section>
  );
}

function KpiCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-blue-500/15 bg-white/55 p-3">
      <p className="micro-label text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-[var(--unifi-ink)]">
        {value}
      </p>
    </div>
  );
}
