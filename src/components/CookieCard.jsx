import './CookieCard.css';

const CATEGORY_CLASS = {
  analytics: 'cookie-card__tag--analytics',
  marketing: 'cookie-card__tag--marketing',
  functional: 'cookie-card__tag--functional',
  personalization: 'cookie-card__tag--personalization',
  tracking: 'cookie-card__tag--tracking',
};

export default function CookieCard({
  name,
  category,
  categoryKind,
  crumbled,
  onCrumble,
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
        {crumbled ? (
          <button
            type="button"
            className="cookie-card__btn cookie-card__btn--primary cookie-card__btn--crumbled"
            disabled
            aria-label={`${name}: already crumbled. This cookie is stopped and cannot be restored on this screen.`}
          >
            Crumbled
          </button>
        ) : (
          <button
            type="button"
            className="cookie-card__btn cookie-card__btn--primary cookie-card__btn--crumble"
            onClick={onCrumble}
            aria-label={`Crumble cookie ${name}: permanently stop it. This cannot be undone on this screen.`}
          >
            Crumble
          </button>
        )}
        <button
          type="button"
          className="cookie-card__btn cookie-card__btn--delete"
          onClick={onDelete}
          aria-label={`Delete ${name} from this list`}
        >
          Delete
        </button>
      </div>
    </article>
  );
}
