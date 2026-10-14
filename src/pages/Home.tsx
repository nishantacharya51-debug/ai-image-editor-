import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Sparkles,
  SlidersHorizontal,
  ShieldCheck,
  ScanLine,
  WandSparkles,
  Layers,
  Plus,
  Minus,
  MousePointer2,
} from "lucide-react";
import { Comparison, EditedPhoto, PresetCard } from "../components/Photo";
import { presets } from "../data/presets";
import { BRAND, SAMPLE } from "../lib/config";
export default function Home() {
  const navigate = useNavigate();
  const [category, setCategory] = useState("All styles");
  const [faq, setFaq] = useState<number | null>(0);
  const [selected, setSelected] = useState(0);
  const featured =
    category === "All styles"
      ? presets.slice(0, 4)
      : presets.filter((p) => p.category === category).slice(0, 4);
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-badge">
            <span className="tiny-star">✦</span> YOUR CREATIVE VISION, WITH A
            LITTLE AI
          </div>
          <h1>
            Good photos.
            <br />
            <span>Extraordinary possibilities.</span>
          </h1>
          <p>
            Turn the photo you took into the photo you imagined.
            <br className="desktop-break" /> Intelligent guidance. Beautiful
            styles. Every detail, yours.
          </p>
          <div className="hero-actions">
            <Link to="/editor" className="button dark">
              Start editing for free <ArrowUpRight size={17} />
            </Link>
            <Link to="/explore" className="button outline">
              Explore styles <ArrowRight size={16} />
            </Link>
          </div>
          <div className="hero-notes">
            <span>
              <Check size={13} /> No sign-up needed
            </span>
            <span>
              <Check size={13} /> Free to create
            </span>
            <span>
              <Check size={13} /> Your photos stay yours
            </span>
          </div>
        </div>
        <div className="hero-workspace">
          <div className="preview-toolbar">
            <div>
              <img
                className="preview-brand-mark"
                src={BRAND.logo}
                alt=""
                width={18}
                height={18}
              />
              <span>YOUR NEXT GREAT EDIT</span>
              <span className="toolbar-divider" />
              <span className="preview-filename">dolomites.jpg</span>
            </div>
            <div>
              <i className="status-dot" />
              <span>Local processing</span>
              <span className="preview-zoom">100%</span>
            </div>
          </div>
          <div className="hero-preview">
            <Comparison original={SAMPLE}>
              <EditedPhoto
                src={SAMPLE}
                maxSize={1400}
                preset={presets[selected]}
              />
            </Comparison>
            <div className="preview-style-card">
              <span className="style-icon">
                <Sparkles size={17} />
              </span>
              <div>
                <span>SMALL CHANGES. BIG FEELING.</span>
                <strong>{presets[selected].name}</strong>
              </div>
              <Check size={15} />
            </div>
            <div className="drag-hint">
              <MousePointer2 size={13} /> Drag to discover the difference
            </div>
          </div>
          <div className="preview-bottom">
            <div className="preview-presets">
              {[0, 1, 3, 7].map((i) => (
                <button
                  key={i}
                  className={selected === i ? "selected" : ""}
                  onClick={() => setSelected(i)}
                >
                  <span className={`preset-dot dot-${i}`} />
                  {presets[i].name}
                </button>
              ))}
            </div>
            <Link to="/editor?demo=1">
              Make it your own <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
        <div className="hero-proof">
          <span>LESS FRICTION. MORE CREATION.</span>
          <div>
            <ScanLine size={18} /> Intelligent insights
          </div>
          <div>
            <SlidersHorizontal size={18} /> Real, precise adjustments
          </div>
          <div>
            <Layers size={18} /> Non-destructive editing
          </div>
          <div>
            <ShieldCheck size={18} /> Private by design
          </div>
        </div>
      </section>
      <section className="section style-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              <span /> FIND YOUR FEELING
            </span>
            <h2>One photo. A whole new perspective.</h2>
            <p>
              A thoughtfully crafted starting point for every kind of story.
            </p>
          </div>
          <Link className="text-link" to="/explore">
            Explore all styles <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="category-chips">
          {[
            "All styles",
            "Portrait",
            "Cinematic",
            "Product",
            "Landscape",
            "Fashion",
            "Black & white",
            "Vintage",
          ].map((c) => (
            <button
              key={c}
              className={c === category ? "active" : ""}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="preset-grid home-preset-grid">
          {featured.map((p) => (
            <PresetCard
              key={p.id}
              preset={p}
              onSelect={() => {
                navigate(`/explore?style=${p.id}`);
              }}
            />
          ))}
        </div>
        <p className="section-footnote">
          Not a one-size-fits-all filter. A fully editable starting point.
        </p>
      </section>
      <section className="feature-section section" id="features">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              <span /> LESS GUESSWORK. MORE YOU.
            </span>
            <h2>
              Thoughtfully intelligent.
              <br />
              Entirely in your control.
            </h2>
          </div>
          <p>
            From your first idea to the final pixel,
            <br />a workspace that stays out of your way.
          </p>
        </div>
        <div className="feature-grid">
          <div className="feature-card feature-ai">
            <span className="feature-icon">
              <Sparkles />
            </span>
            <h3>A fresh pair of eyes.</h3>
            <p>
              Measure light and color locally. Get tailored starting points, or
              invite Gemini to offer a creative perspective.
            </p>
            <div className="analysis-mini">
              <span>
                <ScanLine size={16} /> IMAGE INSIGHTS{" "}
                <i className="status-dot" />
              </span>
              <div>
                <span>Exposure</span>
                <strong>Room for a little light</strong>
              </div>
              <div className="mini-meter">
                <i />
              </div>
              <div className="suggestion-mini">
                <Sparkles size={14} /> Try lifting shadows to reveal more
                detail.
              </div>
            </div>
            <Link to="/editor" className="text-link">
              Meet your creative assistant <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="feature-card">
            <span className="feature-icon">
              <SlidersHorizontal />
            </span>
            <h3>The details make the difference.</h3>
            <p>
              Precise color grading, gentle retouching, crops, and a complete
              set of tonal controls. Always non-destructive.
            </p>
            <div className="sliders-mini">
              {[
                ["Temperature", "24", 65],
                ["Shadows", "18", 58],
                ["Grain", "12", 30],
              ].map(([name, value, width]) => (
                <div key={name}>
                  <span>
                    {name}
                    <b>+{value}</b>
                  </span>
                  <div>
                    <i style={{ width: `${width}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <Link to="/editor" className="text-link">
              Make every detail yours <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="feature-card feature-prompt">
            <span className="feature-icon">
              <WandSparkles />
            </span>
            <h3>If you can say it, start there.</h3>
            <p>
              Describe the light, color, or mood you have in mind. Preview
              suggested adjustments before you commit.
            </p>
            <div className="prompt-mini">
              “Make it warmer, with soft shadows and a little cinematic
              feeling.”
              <span>
                <span>YOUR WORDS. REAL ADJUSTMENTS.</span>
                <ArrowUpRight size={17} />
              </span>
            </div>
            <Link to="/editor" className="text-link">
              Find the right words <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </section>
      <section className="section how-section" id="how-it-works">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              <span /> FROM PHOTO TO POSSIBILITY
            </span>
            <h2>A little process. A lot of possibility.</h2>
          </div>
          <Link to="/help" className="text-link">
            The quick-start guide <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="steps">
          {[
            [
              "Drop in your photo",
              "Start with a JPEG, PNG, or WebP. No account, no complicated setup.",
            ],
            [
              "Find your direction",
              "Explore image insights and choose a style that feels like you.",
            ],
            [
              "Make it your own",
              "Fine-tune the details or describe the mood you’re after.",
            ],
            [
              "Take it with you",
              "Compare your edit and export a high-resolution PNG or JPEG.",
            ],
          ].map(([title, text], i) => (
            <div key={title}>
              <span className="step-number">0{i + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="privacy-banner section">
        <div className="privacy-emblem">
          <ShieldCheck size={40} />
        </div>
        <div>
          <span className="eyebrow">YOUR CREATIVITY. NOT OUR DATA.</span>
          <h2>
            A studio on your device.
            <br />
            Not on someone else’s server.
          </h2>
          <p>
            Your edits and projects live in your browser. Photos only leave your
            device
            <br className="desktop-break" /> when you explicitly choose optional
            Gemini analysis.
          </p>
          <Link to="/privacy" className="text-link">
            A clear picture of your privacy <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="privacy-list">
          <span>
            <Check size={16} /> No account required
          </span>
          <span>
            <Check size={16} /> No hidden uploads
          </span>
          <span>
            <Check size={16} /> No mandatory subscription
          </span>
          <span>
            <Check size={16} /> Originals, always preserved
          </span>
        </div>
      </section>
      <section className="section faq-section">
        <div>
          <span className="eyebrow">
            <span /> A FEW GOOD QUESTIONS
          </span>
          <h2>Good to know.</h2>
          <p>Something else on your mind?</p>
          <Link to="/help" className="text-link">
            Visit the help center <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="faq-list">
          {[
            [
              `Is ${BRAND.full} really free?`,
              "Yes. Local editing, presets, project storage, and export are free, with no account or paid API required. Optional Gemini requests use your server’s configured API quota. There are no paid plans.",
            ],
            [
              "What can the AI actually do?",
              "Local analysis measures brightness, contrast, color and clipping. Optional Gemini adds visual observations and translates prompts into safe editing parameters. It does not generate new objects or replace your subject.",
            ],
            [
              "Do my photos leave my device?",
              "Not for normal editing. Original photos and saved projects remain in this browser’s IndexedDB. Only an explicit Gemini action sends a reduced-size preview to the configured server and Google.",
            ],
            [
              "Can I export at the original resolution?",
              "Yes, up to the supported 40-megapixel input limit. Crop and rotation may change output dimensions. PNG and adjustable-quality JPEG exports are available; no artificial upscaling is used.",
            ],
            [
              "Can I come back to an edit later?",
              "Save your project and reopen it from My workspace on this browser. Your original image and editable parameters are stored locally. Clearing browser data removes them, so export important work.",
            ],
          ].map(([q, a], i) => (
            <div className="faq-item" key={q}>
              <button
                onClick={() => setFaq(faq === i ? null : i)}
                aria-expanded={faq === i}
              >
                {q}
                {faq === i ? <Minus size={18} /> : <Plus size={18} />}
              </button>
              {faq === i && <p>{a}</p>}
            </div>
          ))}
        </div>
      </section>
      <section className="final-cta">
        <span className="eyebrow">MAKE SOMETHING THAT FEELS LIKE YOU</span>
        <h2>Your next great photo is already in your camera roll.</h2>
        <Link className="button lime" to="/editor">
          Let’s bring it to life <ArrowUpRight size={17} />
        </Link>
        <p>JPEG, PNG & WebP · No downloads. No sign-up. Just create.</p>
      </section>
    </>
  );
}
