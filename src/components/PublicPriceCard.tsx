import {
  formatPricePerKg,
  formatPublicPriceDate,
  type PublicPrice,
} from "@/lib/pricing-types";

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
      <span className="public-price-chip" aria-label={`${label}: ${formatPricePerKg(price.priceEurPerKg, locale)}`}>
        <strong>{formatPricePerKg(price.priceEurPerKg, locale)}</strong>
      </span>
    );
  }

  return (
    <div className={`public-price-card public-price-card-${variant}`}>
      <span className="public-price-kicker">{label}</span>
      <strong>{formatPricePerKg(price.priceEurPerKg, locale)}</strong>
      <time dateTime={price.priceDate}>{formatPublicPriceDate(price.priceDate, locale)}</time>
      {note ? <small>{note}</small> : null}
    </div>
  );
}
