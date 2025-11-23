import StagingFlow from './StagingFlow';

export default function StagingPage() {
  return (
    <div className="ingest-layout">
      <section className="ingest-hero">
        <div>
          <p className="eyebrow">AI pipeline</p>
          <h1>Recipe Ingestion</h1>
          <p className="text-muted" style={{ maxWidth: '640px' }}>
            Pull recipes from URLs or pasted text. We parse ingredients, steps, and metadata automatically, keeping
            everything in metric so your menus stay consistent.
          </p>
          <div className="ingest-hero-tags">
            <span className="pill pill-strong">Batch aware</span>
            <span className="pill">URL & text</span>
            <span className="pill pill-success">Allergens tracked</span>
          </div>
        </div>
        <div className="ingest-sidecard">
          <p className="text-muted">Need a reminder?</p>
          <ul>
            <li>Paste a recipe URL or full text.</li>
            <li>We’ll split multiple recipes automatically.</li>
            <li>Edit results before committing to the library.</li>
          </ul>
        </div>
      </section>
      <StagingFlow />
    </div>
  );
}
