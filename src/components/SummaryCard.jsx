import './SummaryCard.css';

export default function SummaryCard({ total, harmful, safe, inactive }) {
  return (
    <section
      className="summary-card"
      aria-label="Cookie summary"
      aria-disabled={inactive}
    >
      <h2 className="summary-card__title">Cookie Summary</h2>
      <div className="summary-card__rows">
        <div className="summary-card__row">
          <span className="summary-card__label">Total Cookies</span>
          <span className="summary-card__value">{total}</span>
        </div>
        <div className="summary-card__row">
          <span className="summary-card__label">Harmful Cookies</span>
          <span className="summary-card__value summary-card__value--harmful">{harmful}</span>
        </div>
        <div className="summary-card__row">
          <span className="summary-card__label">Safe Cookies</span>
          <span className="summary-card__value summary-card__value--safe">{safe}</span>
        </div>
      </div>
    </section>
  );
}
