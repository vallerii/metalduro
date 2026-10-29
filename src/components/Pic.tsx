import Image from "next/image";

/** Фото или аккуратная заглушка с подписью, пока файла нет. */
export function Pic({
  src,
  alt,
  label,
  className = "",
  sizes = "(min-width: 1024px) 33vw, 100vw",
  priority,
}: {
  src: string | null;
  alt: string;
  label?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden bg-paper-lo ${className}`}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <div className="hatch absolute inset-0 flex items-end p-3">
          {label !== "" && <span className="label-mono text-paper/70">{label ?? alt} · foto</span>}
        </div>
      )}
    </div>
  );
}
