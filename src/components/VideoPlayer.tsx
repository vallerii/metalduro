"use client";

import { useRef, useState } from "react";

export function VideoPlayer({
  src,
  poster,
  title,
  caption,
  watchLabel = "Ver vídeo",
  className = "",
}: {
  src: string;
  poster: string;
  title: string;
  caption?: string;
  watchLabel?: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-ink ${className}`}>
      <video
        ref={ref}
        src={src}
        poster={poster}
        preload="none"
        playsInline
        controls={started}
        className={`absolute inset-0 h-full w-full ${started ? "object-contain" : "object-cover opacity-60"}`}
      />
      {!started && (
        <button
          type="button"
          onClick={() => {
            setStarted(true);
            ref.current?.play();
          }}
          className="group absolute inset-0 flex flex-col justify-end p-5 text-left text-paper"
          aria-label={`${watchLabel}: ${title}`}
        >
          <span className="grid size-14 place-items-center bg-accent text-xl text-ink transition-transform group-hover:scale-110">▶</span>
          <span className="mt-4 text-[22px] leading-tight font-medium tracking-tight">{title}</span>
          {caption && <span className="label-mono mt-1 text-paper/80">{caption}</span>}
        </button>
      )}
    </div>
  );
}
