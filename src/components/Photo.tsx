import { assetUrl } from "../lib/paths";
import { useEffect, useRef, useState } from "react";
import { ChevronsLeftRight, Heart, ArrowUpRight } from "lucide-react";
import { renderImage } from "../engine/render";
import { initialEdit, type Preset, type EditState } from "../engine/types";
import { Link } from "react-router-dom";
import { BRAND } from "../lib/config";
export function EditedPhoto({
  src,
  preset,
  edit,
  className = "",
  alt = "Edited photograph",
  maxSize = 600,
}: {
  src: string;
  preset?: Preset;
  edit?: EditState;
  className?: string;
  alt?: string;
  maxSize?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!container.current || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" },
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    let live = true;
    const image = new Image();
    image.onload = async () => {
      if (!live) return;
      try {
        const state = edit ?? {
          ...initialEdit(),
          adjustments: { ...initialEdit().adjustments, ...preset?.adjustments },
        };
        const result = await renderImage(image, state, maxSize);
        if (live && ref.current) {
          ref.current.width = result.width;
          ref.current.height = result.height;
          ref.current.getContext("2d")!.drawImage(result, 0, 0);
        }
      } catch {
        /* The source image stays visible if preview rendering fails. */
      }
    };
    image.src = src;
    return () => {
      live = false;
    };
  }, [src, preset, edit, maxSize, visible]);
  return (
    <div ref={container} className={`edited-photo ${className}`}>
      <img src={src} alt="" loading="lazy" />
      <canvas ref={ref} role="img" aria-label={alt} />
    </div>
  );
}
export function Comparison({
  original,
  edited,
  children,
  className = "",
}: {
  original: string;
  edited?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const [split, setSplit] = useState(50);
  return (
    <div className={`comparison ${className}`}>
      <div className="compare-after">
        {edited ? <img src={edited} alt="Edited photograph" /> : children}
      </div>
      <div
        className="compare-before"
        style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
      >
        <img src={original} alt="Original photograph" />
      </div>
      <div className="compare-divider" style={{ left: `${split}%` }}>
        <span>
          <ChevronsLeftRight size={21} />
        </span>
      </div>
      <span className="compare-label before-label">ORIGINAL</span>
      <span className="compare-label after-label">
        WITH {BRAND.name} <span>✦</span>
      </span>
      <input
        aria-label="Before and after comparison"
        className="comparison-range"
        type="range"
        min="0"
        max="100"
        value={split}
        onChange={(e) => setSplit(+e.target.value)}
      />
    </div>
  );
}
export function PresetCard({
  preset,
  favorite,
  onFavorite,
  onSelect,
}: {
  preset: Preset;
  favorite?: boolean;
  onFavorite?: () => void;
  onSelect?: () => void;
}) {
  return (
    <article className="preset-card">
      <div className="preset-photo">
        <EditedPhoto
          src={assetUrl(`images/${preset.image}.jpg`)}
          preset={preset}
          maxSize={240}
          alt={`${preset.name} example`}
        />
        <span className="photo-category">{preset.category}</span>
        {onFavorite && (
          <button
            className={`favorite-button ${favorite ? "active" : ""}`}
            aria-label={`${favorite ? "Unfavorite" : "Favorite"} ${preset.name}`}
            onClick={onFavorite}
          >
            <Heart size={16} fill={favorite ? "currentColor" : "none"} />
          </button>
        )}
        <button
          className="preset-preview-button"
          onClick={onSelect}
          aria-label={`Preview ${preset.name}`}
        >
          Preview style <ArrowUpRight size={16} />
        </button>
      </div>
      <div className="preset-card-title">
        <h3>{preset.name}</h3>
        {onSelect ? (
          <button
            className="icon-button"
            aria-label={`View ${preset.name}`}
            onClick={onSelect}
          >
            <ArrowUpRight size={18} />
          </button>
        ) : (
          <Link
            to={`/editor?preset=${preset.id}`}
            aria-label={`Apply ${preset.name}`}
          >
            <ArrowUpRight size={18} />
          </Link>
        )}
      </div>
      <p>{preset.description}</p>
    </article>
  );
}
