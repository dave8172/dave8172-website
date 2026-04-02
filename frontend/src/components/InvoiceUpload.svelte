<script>
  import { onMount } from "svelte";
  import DynamicButton from "./DynamicButton.svelte";

  const API_BASE = "http://65.20.79.200/api";
  const EMPTY_VALUE = "Not available";

  let file = null;
  let loading = false;
  let result = null;
  let error = null;
  let successfulDocuments = null;
  let processingStage = 1;
  let stageTimers = [];
  let currentJobId = null;
  let processingStatus = "queued";
  let processingMode = "";
  let lastDurationSeconds = 0;
  let averageProcessingSeconds = 0;

  onMount(() => {
    loadStats();
  });

  function displayValue(value) {
    return value && String(value).trim() ? value : EMPTY_VALUE;
  }

  function formatTag(value) {
    if (!value) return EMPTY_VALUE;

    return String(value)
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function updateProcessingStage(status) {
    const stageByStatus = {
      queued: 1,
      extracting: 1,
      analyzing: 2,
      finalizing: 3,
      completed: 3,
      failed: 3
    };

    processingStage = stageByStatus[status] ?? 1;
    processingStatus = status;
  }

  function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return "Not available";

    if (seconds < 60) {
      return `${Math.round(seconds)} sec`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return remainingSeconds
      ? `${minutes} min ${remainingSeconds} sec`
      : `${minutes} min`;
  }

  function getProcessingCopy(status, mode) {
    const isScan = mode === "vision_ocr";

    if (status === "queued" || status === "extracting") {
      return {
        title: isScan ? "Preparing scanned pages for OCR" : "Checking and extracting document text"
      };
    }

    if (status === "analyzing") {
      return {
        title: isScan ? "Running OCR and structured extraction" : "Structuring the extracted document data"
      };
    }

    if (status === "finalizing") {
      return {
        title: "Wrapping up the final response"
      };
    }

    return {
      title: "Reading, extracting, and structuring your file"
    };
  }

  async function loadStats() {
    try {
      const res = await fetch(`${API_BASE}/processing-stats`);
      if (!res.ok) throw new Error("Unable to load processing stats");
      const data = await res.json();
      successfulDocuments = data.successful_documents;
      averageProcessingSeconds = data.average_processing_seconds || 0;
    } catch {
      successfulDocuments = successfulDocuments ?? 0;
      averageProcessingSeconds = averageProcessingSeconds ?? 0;
    }
  }

  async function upload() {
    if (!file) {
      error = "Please choose a PDF or image first";
      return;
    }

    loading = true;
    error = null;
    result = null;
    currentJobId = null;
    processingMode = "";
    lastDurationSeconds = 0;
    updateProcessingStage("queued");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/upload-invoice`, {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.detail || "Upload failed");
      }

      const job = await res.json();
      currentJobId = job.job_id;
      await pollJobStatus(job.job_id);
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function pollJobStatus(jobId) {
    while (true) {
      const res = await fetch(`${API_BASE}/jobs/${jobId}`);
      if (!res.ok) {
        throw new Error("Unable to fetch processing status");
      }

      const job = await res.json();
      updateProcessingStage(job.status);
      processingMode = job.processing_mode || processingMode;

      if (job.status === "completed") {
        result = job.result;
        lastDurationSeconds = job.duration_seconds || 0;
        await loadStats();
        currentJobId = null;
        return;
      }

      if (job.status === "failed") {
        currentJobId = null;
        throw new Error(job.error || "Document processing failed");
      }

      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 1200);
        stageTimers = [timer];
      });
      stageTimers.forEach((timer) => clearTimeout(timer));
      stageTimers = [];
    }
  }
</script>

<section class="invoice">
  <h2>Invoice AI Extractor</h2>

  <div class="upload-row">
    <input
      type="file"
      accept="application/pdf,image/png,image/jpeg,image/webp"
      on:change={(e) => (file = e.target.files[0])}
    />

    <DynamicButton on:click={upload} disabled={loading}>
      {loading ? "Processing..." : "Upload Document"}
    </DynamicButton>
  </div>

  {#if file}
    <p class="file-note">Selected file: {file.name}</p>
  {/if}

  {#if error}
    <p class="error">{error}</p>
  {/if}

  {#if loading}
    <div class="loading-card" aria-live="polite">
      <div class="loading-header">
        <div class="loading-pulse" aria-hidden="true"></div>
        <div>
          <p class="eyebrow">Processing document</p>
          <h3>{getProcessingCopy(processingStatus, processingMode).title}</h3>
        </div>
      </div>

      <div class="loading-steps">
        <div class:active={processingStage >= 1}>
          <strong>1</strong>
          <span>Checking for embedded text or scanned pages</span>
        </div>
        <div class:active={processingStage >= 2}>
          <strong>2</strong>
          <span>Running extraction and normalizing the fixed schema</span>
        </div>
        <div class:active={processingStage >= 3}>
          <strong>3</strong>
          <span>Preparing readable results for review</span>
        </div>
      </div>

      <div class="loading-skeleton" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>

      {#if currentJobId}
        <p class="job-note">Tracking job: {currentJobId.slice(0, 8)}</p>
      {/if}
    </div>
  {/if}

  {#if result}
    <div class="invoice-card">
      <div class="result-header">
        <div class="result-title">
          <p class="eyebrow">Structured extraction</p>
          <h3>{displayValue(result.vendor) === EMPTY_VALUE ? "Processed document" : result.vendor}</h3>
          <p class="result-subtitle">
            Fixed-schema output for financial document processing.
          </p>
        </div>

        <div class="pills">
          <span>{formatTag(result.document_type)}</span>
          <span>{result.processing_mode === "vision_ocr" ? "OCR fallback" : "Embedded text"}</span>
        </div>
      </div>

      <div class="amount-strip">
        <div class="amount-card">
          <strong>Subtotal</strong>
          <span>{displayValue(result.subtotal)}</span>
        </div>
        <div class="amount-card">
          <strong>Tax</strong>
          <span>{displayValue(result.tax)}</span>
        </div>
        <div class="amount-card total">
          <strong>Total</strong>
          <span>{displayValue(result.total)}</span>
        </div>
      </div>

      <div class="result-section">
        <div class="section-header">
          <h4>Document details</h4>
          <p>Key metadata extracted from the uploaded file.</p>
        </div>

        <div class="detail-grid">
          <div><strong>Document type</strong><span>{formatTag(result.document_type)}</span></div>
          <div><strong>Document No.</strong><span>{displayValue(result.document_number)}</span></div>
          <div><strong>Date</strong><span>{displayValue(result.date)}</span></div>
          <div><strong>Due date</strong><span>{displayValue(result.due_date)}</span></div>
          <div><strong>Currency</strong><span>{displayValue(result.currency)}</span></div>
          <div><strong>Category</strong><span>{displayValue(result.category)}</span></div>
          <div><strong>Payment method</strong><span>{displayValue(result.payment_method)}</span></div>
          <div><strong>PO number</strong><span>{displayValue(result.purchase_order_number)}</span></div>
        </div>
      </div>

      <div class="result-section">
        <div class="section-header">
          <h4>Line items</h4>
          <p>Individual rows are shown only when they are clearly detected.</p>
        </div>

        {#if result.line_items?.length}
          <div class="line-item-list">
            <div class="line-item line-item-head">
              <span>Description</span>
              <span>Qty</span>
              <span>Unit</span>
              <span>Amount</span>
            </div>
            {#each result.line_items as item}
              <div class="line-item">
                <span>{displayValue(item.description)}</span>
                <span>{displayValue(item.quantity)}</span>
                <span>{displayValue(item.unit_price)}</span>
                <span>{displayValue(item.amount)}</span>
              </div>
            {/each}
          </div>
        {:else}
          <div class="empty-state">
            No clear line items were detected for this document.
          </div>
        {/if}
      </div>

      <div class="result-section summary-card">
        <div class="section-header">
          <h4>Summary</h4>
        </div>

        <p class="summary-body">{displayValue(result.summary)}</p>
      </div>

      <p class="result-timing">Time taken: {formatDuration(lastDurationSeconds)}</p>
    </div>
  {/if}

  <div class="stats-card">
    <div class="stats-grid">
      <div class="stats-metric">
        <p class="stats-label">Processed documents</p>
        <p class="stats-number">{successfulDocuments === null ? "..." : successfulDocuments}</p>
        <p class="stats-copy">successful documents since launch</p>
      </div>
      <div class="stats-metric">
        <p class="stats-label">Average processing time</p>
        <p class="stats-number small">{formatDuration(averageProcessingSeconds)}</p>
        <p class="stats-copy">calculated from lifetime successful runs</p>
      </div>
    </div>
  </div>
</section>

<style>
  .invoice {
    margin-top: 2rem;
  }

  .upload-row {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    align-items: center;
    margin: 1.2rem 0 1.5rem;
  }

  input[type="file"] {
    border: 1px solid var(--border);
    padding: 0.75rem;
    border-radius: 10px;
    background: var(--bg);
    color: var(--text);
  }

  .file-note {
    margin: -0.4rem 0 1.25rem;
    color: var(--muted);
    font-size: 0.92rem;
  }

  .loading-card,
  .invoice-card,
  .stats-card {
    border: 1px solid var(--border);
    border-radius: 18px;
    background: var(--bg);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.04);
  }

  .loading-card {
    padding: 1.35rem;
    margin-bottom: 1rem;
  }

  .loading-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  .loading-header h3 {
    margin: 0.15rem 0 0;
    font-size: 1.15rem;
  }

  .loading-pulse {
    width: 0.9rem;
    height: 0.9rem;
    border-radius: 999px;
    background: var(--accent);
    box-shadow: 0 0 0 rgba(37, 99, 235, 0.4);
    animation: pulse 1.4s ease-in-out infinite;
    flex-shrink: 0;
  }

  .loading-steps {
    display: grid;
    gap: 0.7rem;
    margin-bottom: 1rem;
  }

  .loading-steps div {
    display: grid;
    grid-template-columns: 1.5rem 1fr;
    gap: 0.75rem;
    align-items: center;
    color: var(--muted);
    transition: color 0.2s ease, transform 0.2s ease;
  }

  .loading-steps strong {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 999px;
    border: 1px solid var(--border);
    color: var(--text);
    font-size: 0.78rem;
  }

  .loading-steps div.active {
    color: var(--text);
    transform: translateX(2px);
  }

  .loading-steps div.active strong {
    border-color: color-mix(in srgb, var(--accent) 24%, var(--border) 76%);
    background: color-mix(in srgb, var(--bg) 86%, var(--accent) 14%);
    color: var(--accent);
  }

  .loading-skeleton {
    display: grid;
    gap: 0.7rem;
  }

  .loading-skeleton span {
    height: 0.85rem;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--border), rgba(127, 127, 127, 0.12), var(--border));
    background-size: 200% 100%;
    animation: shimmer 1.5s linear infinite;
  }

  .loading-skeleton span:nth-child(1) {
    width: 100%;
  }

  .loading-skeleton span:nth-child(2) {
    width: 86%;
  }

  .loading-skeleton span:nth-child(3) {
    width: 72%;
  }

  .job-note {
    margin: 0.9rem 0 0;
    color: var(--muted);
    font-size: 0.82rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .invoice-card {
    padding: 1.5rem;
    animation: fadeIn 0.25s ease;
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
    margin-bottom: 1.25rem;
  }

  .result-header h3 {
    margin: 0.2rem 0 0;
    font-size: clamp(1.3rem, 2.4vw, 1.7rem);
  }

  .result-title {
    min-width: 0;
  }

  .result-subtitle {
    margin: 0.45rem 0 0;
    color: var(--muted);
    font-size: 0.95rem;
  }

  .eyebrow {
    margin: 0;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--muted);
  }

  .pills {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .pills span {
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 0.35rem 0.75rem;
    font-size: 0.8rem;
    background: var(--bg);
    text-transform: capitalize;
  }

  .amount-strip {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.9rem;
    margin-bottom: 1.25rem;
  }

  .amount-card,
  .detail-grid div,
  .empty-state,
  .summary-card {
    border-radius: 14px;
    border: 1px solid var(--border);
    background: color-mix(in srgb, var(--bg) 92%, var(--accent) 8%);
  }

  .amount-card {
    padding: 1rem 1.05rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .amount-card strong {
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }

  .amount-card span {
    font-size: 1.18rem;
    font-weight: 600;
    color: var(--text);
    word-break: break-word;
  }

  .amount-card.total {
    border-color: color-mix(in srgb, var(--accent) 28%, var(--border) 72%);
  }

  .result-section {
    margin-top: 1.15rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: baseline;
    margin-bottom: 0.8rem;
  }

  .section-header h4 {
    margin: 0;
    font-size: 1rem;
  }

  .section-header p {
    margin: 0;
    color: var(--muted);
    font-size: 0.9rem;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }

  .detail-grid div {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.9rem;
  }

  .detail-grid strong {
    font-size: 0.75rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .detail-grid span,
  .summary-body,
  .line-item span {
    color: var(--text);
    word-break: break-word;
  }

  .line-item-list {
    display: grid;
    gap: 0.65rem;
  }

  .line-item {
    display: grid;
    grid-template-columns: minmax(0, 2.2fr) repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
    padding: 0.85rem 0.95rem;
    border-radius: 14px;
    background: var(--bg);
    border: 1px solid var(--border);
    font-size: 0.92rem;
  }

  .line-item-head {
    background: transparent;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 0.76rem;
    font-weight: 600;
  }

  .line-item-head span {
    color: var(--muted);
  }

  .empty-state,
  .summary-card {
    padding: 1rem 1.05rem;
  }

  .summary-body {
    margin: 0;
    line-height: 1.6;
  }

  .result-timing {
    margin: 1rem 0 0;
    color: var(--muted);
    font-size: 0.94rem;
  }

  .error {
    color: #dc2626;
    margin-bottom: 1rem;
  }

  .stats-card {
    margin-top: 1rem;
    padding: 1.4rem 1.35rem 1.3rem;
    position: relative;
    overflow: hidden;
  }

  .stats-card::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    width: 4px;
    background: var(--accent);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.2rem;
    align-items: stretch;
  }

  .stats-metric {
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: 0.45rem;
    padding: 1rem 1.05rem;
    min-height: 170px;
    border-radius: 14px;
    border: 1px solid color-mix(in srgb, var(--accent) 12%, var(--border) 88%);
    background: color-mix(in srgb, var(--bg) 94%, var(--accent) 6%);
    text-align: center;
    align-items: center;
  }

  .stats-label {
    margin: 0;
    color: var(--muted);
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .stats-number {
    margin: 0;
    align-self: center;
    color: var(--accent);
    font-size: clamp(2.1rem, 5vw, 3rem);
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1;
  }

  .stats-number.small {
    font-size: clamp(1.55rem, 3vw, 2.2rem);
  }

  .stats-copy {
    margin: 0;
    align-self: end;
    max-width: 20rem;
    color: var(--muted);
    font-size: 0.96rem;
    line-height: 1.45;
  }

  @media (prefers-color-scheme: dark) {
    .loading-card,
    .invoice-card,
    .stats-card {
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.18);
    }
  }

  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.35);
    }

    50% {
      transform: scale(1.12);
      box-shadow: 0 0 0 8px rgba(37, 99, 235, 0);
    }
  }

  @keyframes shimmer {
    from {
      background-position: 200% 0;
    }

    to {
      background-position: -200% 0;
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 640px) {
    .result-header,
    .stats-card {
      display: grid;
    }

    .amount-strip {
      grid-template-columns: 1fr;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .section-header {
      display: grid;
    }

    .line-item {
      grid-template-columns: 1fr;
    }

    .line-item-head {
      display: none;
    }
  }
</style>
