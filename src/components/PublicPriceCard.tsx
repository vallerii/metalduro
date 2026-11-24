import {
  formatPricePerKg,
  formatPublicPriceDate,
  type PublicPrice,
} from "@/lib/pricing-types";

function upTo(value: string, locale: "es" | "ru") {
  return locale === "ru" ? `до ${value}` : `hasta ${value}`;
}

export function PublicPriceCard({
  price,
  locale,
  variant,
  label,
  note,
}: {
  price: PublicPrice;
  locale: "es" | "ru";
  variant: "header" | "hero" | "preview";
  label: string;
  note?: string;
}) {
  if (variant === "header") {
    return (
      <span className="public-price-chip" aria-label={`${label}: ${upTo(formatPricePerKg(price.priceEurPerKg, locale), locale)}`}>
        <strong>{upTo(formatPricePerKg(price.priceEurPerKg, locale), locale)}</strong>
      </span>
    );
  }

  return (
    <div className={`public-price-card public-price-card-${variant}`}>
      <span className="public-price-kicker">{label}</span>
      <strong>{upTo(formatPricePerKg(price.priceEurPerKg, locale), locale)}</strong>
      <time dateTime={price.priceDate}>{formatPublicPriceDate(price.priceDate, locale)}</time>
      {note ? <small>{note}</small> : null}
    </div>
  );
}
