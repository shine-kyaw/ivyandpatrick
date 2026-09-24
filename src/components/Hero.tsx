import { Divider, Sprig } from "./Ornament";
import type { Lang, SiteContent } from "./types";

type Props = { lang: Lang; content: SiteContent; onViewCard: () => void };

type Person = SiteContent["couple"]["groom"] | SiteContent["couple"]["bride"];

function PersonBlock({ person, lang, relation }: { person: Person; lang: Lang; relation: string }) {
  const parents = (
    <span lang="my" className="person__parents-names">
      {person.parentsMy}
    </span>
  );
  const [before, after] = relation.split("{parents}");
  const lineage = (
    <p className={`person__lineage${lang === "en" ? " person__lineage--stacked" : ""}`}>
      {before}
      {parents}
      {after}
    </p>
  );

  return (
    <div className="person" data-rise-hero>
      {lang === "my" && lineage}
      {lang === "my" ? (
        <p className="person__name">
          <span lang="my" className="person__name-my">
            {person.nameMy}
          </span>{" "}
          <span className="person__name-en person__name-en--aside">({person.name})</span>
        </p>
      ) : (
        <>
          <p className="person__name">
            <span className="person__name-en">{person.name}</span>
          </p>
          <p lang="my" className="person__name-sub">
            {person.nameMy}
          </p>
        </>
      )}
      {lang === "en" && lineage}
      <ul className="person__credentials" lang="en">
        {person.credentials.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    </div>
  );
}

export default function Hero({ lang, content, onViewCard }: Props) {
  const t = content.dicts[lang];
  const { couple, wedding } = content;

  return (
    <section className="hero" aria-labelledby="hero-title">
      <Sprig name="b" className="hero__sprig hero__sprig--l" />
      <Sprig name="c" className="hero__sprig hero__sprig--r" />
      <div className="invite">
        <img
          className="invite__top"
          src="/art/frame-top.webp"
          width={881}
          height={510}
          alt=""
          fetchPriority="high"
          decoding="async"
        />
        <div className="invite__body">
          <h1 id="hero-title" className="sr-only" tabIndex={-1}>
            {lang === "my" ? `${couple.groom.nameMy} နှင့် ${couple.bride.nameMy}` : "Patrick and Ivy"} — {t.gate.kicker}
          </h1>

          <Divider className="invite__divider" />
          <p className="invite__title" lang="my" data-rise-hero>
            {content.cardTitle}
          </p>
          {t.hero.subtitle && (
            <p className="invite__subtitle" data-rise-hero>
              {t.hero.subtitle}
            </p>
          )}

          <PersonBlock person={couple.groom} lang={lang} relation={t.hero.sonOf} />
          <p className="invite__and" data-rise-hero>
            {t.hero.and}
          </p>
          <PersonBlock person={couple.bride} lang={lang} relation={t.hero.daughterOf} />

          <p className="invite__text" data-rise-hero>
            {t.hero.body}
          </p>

          <Divider className="invite__divider" />

          <dl className="invite__facts" data-rise-hero>
            <div>
              <dt>{t.hero.dateLabel}</dt>
              <dd>{t.date.long}</dd>
            </div>
            <div>
              <dt>{t.hero.timeLabel}</dt>
              <dd>
                {t.date.time}
                {wedding.timezoneLabel && <span className="invite__tz"> · {wedding.timezoneLabel[lang]}</span>}
              </dd>
            </div>
            <div>
              <dt>{t.hero.venueLabel}</dt>
              <dd lang="en">{wedding.venue.name}</dd>
            </div>
            <div>
              <dt>{t.hero.dressLabel}</dt>
              <dd>{t.hero.dress}</dd>
            </div>
          </dl>

          <div className="invite__actions" data-rise-hero>
            <a id="hero-cta" className="btn btn--primary" href="#rsvp">
              {t.hero.cta}
            </a>
            <button type="button" className="btn btn--link" onClick={onViewCard}>
              {t.hero.viewCard}
            </button>
          </div>
        </div>
        <img
          className="invite__bottom"
          src="/art/frame-bottom.webp"
          width={881}
          height={482}
          alt=""
          decoding="async"
        />
      </div>
    </section>
  );
}
