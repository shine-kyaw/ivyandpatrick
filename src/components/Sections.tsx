import { fill } from "@/lib/format";
import { Divider, Sprig } from "./Ornament";
import type { Lang, SiteContent } from "./types";

type Props = { lang: Lang; content: SiteContent };

function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function Details({ lang, content }: Props) {
  const t = content.dicts[lang];
  const { wedding } = content;
  const d = t.details;

  return (
    <section className="details" aria-labelledby="details-title">
      <Sprig name="a" className="details__sprig" />
      <header className="section-head" data-rise>
        <h2 id="details-title" className="section-title">
          {d.heading}
        </h2>
        <Divider />
      </header>

      <div className="details__grid">
        <article className="detail" data-rise>
          <h3 className="detail__title">{d.whenTitle}</h3>
          <p className="detail__main">{t.date.long}</p>
          <p className="detail__sub">
            {t.date.time}
            {wedding.timezoneLabel && ` · ${wedding.timezoneLabel[lang]}`}
          </p>
          <a className="detail__action" href="/calendar.ics" download>
            {d.calendar}
          </a>
        </article>

        <article className="detail" data-rise>
          <h3 className="detail__title">{d.whereTitle}</h3>
          <p className="detail__main" lang="en">
            {wedding.venue.name}
          </p>
          <p className="detail__sub">{wedding.venue.address ? wedding.venue.address[lang] : d.addressPending}</p>
          {wedding.venue.mapUrl && (
            <a className="detail__action" href={wedding.venue.mapUrl} target="_blank" rel="noopener noreferrer">
              {d.map}
            </a>
          )}
        </article>

        <article className="detail" data-rise>
          <h3 className="detail__title">{d.wearTitle}</h3>
          <p className="detail__main">{d.wear}</p>
          <p className="detail__sub">{d.wearNote}</p>
        </article>

        {wedding.gifts && (
          <article className="detail" data-rise>
            <h3 className="detail__title">{d.giftsTitle}</h3>
            <p className="detail__sub">{wedding.gifts[lang]}</p>
          </article>
        )}
      </div>
    </section>
  );
}

export function Faq({ lang, content }: Props) {
  const f = content.dicts[lang].faq;
  return (
    <section className="faq" aria-labelledby="faq-title">
      <header className="section-head" data-rise>
        <h2 id="faq-title" className="section-title">
          {f.heading}
        </h2>
        <Divider />
      </header>
      <div className="faq__list">
        {f.items.map((item) => (
          <details className="faq__item" key={item.q} data-rise>
            <summary className="faq__q">
              <span>{item.q}</span>
              <span className="faq__icon" aria-hidden="true" />
            </summary>
            <p className="faq__a">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function Contact({ lang, content }: Props) {
  const c = content.wedding.contact;
  if (!c) return null;
  const t = content.dicts[lang].contact;
  const digits = c.phone.replace(/\D/g, "");
  return (
    <section className="contact" aria-labelledby="contact-title" data-rise>
      <h2 id="contact-title" className="contact__title">
        {t.heading}
      </h2>
      <p className="contact__body">{fill(t.body, { name: c.name })}</p>
      <p className="contact__phone">{c.phone}</p>
      <div className="contact__actions">
        <a className="btn btn--ghost" href={telHref(c.phone)}>
          {t.call}
        </a>
        {c.viber && (
          <a className="btn btn--ghost" href={`viber://chat?number=%2B${digits}`}>
            {t.viber}
          </a>
        )}
        {c.whatsapp && (
          <a className="btn btn--ghost" href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer">
            {t.whatsapp}
          </a>
        )}
      </div>
    </section>
  );
}

export function Footer({ lang, content }: Props) {
  const { couple } = content;
  return (
    <footer className="footer">
      <Sprig name="d" className="footer__sprig" />
      <p className="footer__names">
        Patrick <span className="footer__amp">&amp;</span> Ivy
      </p>
      <p className="footer__names-my" lang="my">
        {couple.groom.nameMy} · {couple.bride.nameMy}
      </p>
      <p className="footer__date">{content.dicts[lang].footer.date}</p>
    </footer>
  );
}
