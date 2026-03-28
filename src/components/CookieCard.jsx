import './CookieCard.css';

const CATEGORY_CLASS = {
  analytics: 'cookie-card__tag--analytics',
  marketing: 'cookie-card__tag--marketing',
  functional: 'cookie-card__tag--functional',
};

export default function CookieCard({
  name,
  category,
  categoryKind,
  allowed,
  onToggle,
  onDelete,
}) {
  return (
    <article className="cookie-card">
      <div className="cookie-card__main">
        <h3 className="cookie-card__name">{name}</h3>
        <span
          className={`cookie-card__tag ${CATEGORY_CLASS[categoryKind] ?? ''}`}
        >
          {category}
        </span>
      </div>
      <div className="cookie-card__actions">
        <button
          type="button"
          className={`cookie-card__btn cookie-card__btn--primary ${
            allowed ? 'cookie-card__btn--block' : 'cookie-card__btn--allow'
          }`}
          onClick={onToggle}
          aria-label={
            allowed
              ? `Block cookie ${name}`
              : `Unblock cookie ${name}`
          }
        >
          {allowed ? 'Block' : 'Unblock'}
        </button>
        <button
          type="button"
          className="cookie-card__btn cookie-card__btn--delete"
          onClick={onDelete}
          aria-label={`Delete cookie ${name}`}
        >
          Delete
        </button>
      </div>
    </article>
  );
}
