
<script>
    import DynamicButton from "./DynamicButton.svelte";

  let file = null;
  let loading = false;
  let result = null;
  let error = null;

  async function upload() {
    if (!file) {
      error = "Please choose a PDF first";
      return;
    }

    loading = true;
    error = null;
    result = null;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("https://davewebsite-invoiceai.onrender.com/api/upload-invoice", {
        method: "POST",
        body: formData
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();

      try {
        result = JSON.parse(data.analysis);
      } catch {
        result = { raw: data.analysis };
      }

    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

<section class="invoice">
  <h2>Invoice AI Extractor</h2>

  <div class="upload-row">
    <input
      type="file"
      accept="application/pdf"
      on:change={(e) => (file = e.target.files[0])}
    />

    <DynamicButton on:click={upload} disabled={loading}>
      {loading ? "Processing..." : "Upload Invoice"}
    </DynamicButton>
  </div>

  {#if error}
    <p class="error">{error}</p>
  {/if}

  {#if result}
    <div class="invoice-card">
      {#if result.raw}
        <pre>{result.raw}</pre>
      {:else}
        <div class="grid">
          <div><strong>Vendor</strong><span>{result.vendor}</span></div>
          <div><strong>Date</strong><span>{result.date}</span></div>
          <div><strong>Total</strong><span>{result.total}</span></div>
          <div><strong>Tax</strong><span>{result.tax}</span></div>
          <div><strong>Category</strong><span>{result.category}</span></div>
        </div>

        <p class="insights">
          <strong>Insights:</strong> {result.insights}
        </p>
      {/if}
    </div>
  {/if}
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
    margin-bottom: 1.5rem;
  }

  input[type="file"] {
    border: 1px solid var(--border);
    padding: 0.6rem;
    border-radius: 6px;
    background: var(--bg);
    color: var(--text);
  }

  .invoice-card {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1.5rem;
    background: var(--bg);
    animation: fadeIn 0.25s ease;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .grid div {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .grid strong {
    font-size: 0.75rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .insights {
    margin-top: 1rem;
    color: var(--muted);
  }

  .error {
    color: #dc2626;
    margin-bottom: 1rem;
  }

  pre {
    white-space: pre-wrap;
    font-size: 0.9rem;
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
</style>
