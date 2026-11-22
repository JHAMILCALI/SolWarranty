import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { WalletButton } from "../components/WalletButton";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "../styles/landing.css";
import "../styles/landing-reference.css";
const Scene = lazy(() => import("../components/landing/Scene"));
gsap.registerPlugin(ScrollTrigger);
const explorer =
  "https://explorer.solana.com/address/7uYrQU8oTEK7JaPfAcZPQSQcJLMs2BmxfmVkc1iSbFp4?cluster=devnet";
const features = [
  {
    title: "Cada producto, su registro.",
    label: "Garantías digitales",
    text: "Crea un borrador, asigna la wallet del comprador y activa su garantía. La cobertura empieza cuando la tienda la activa.",
    icon: "document",
  },
  {
    title: "La confianza se comprueba.",
    label: "Verificación pública",
    text: "Consulta el producto, su tienda, la vigencia y el estado del registro. Para verificar no necesitas firmar una transacción.",
    icon: "search",
  },
  {
    title: "Un problema. Un seguimiento.",
    label: "Reclamaciones",
    text: "El comprador presenta una solicitud durante la vigencia. La tienda acepta o rechaza la reclamación y su resolución queda registrada.",
    icon: "chat",
  },
  {
    title: "Tu wallet. Tu control.",
    label: "Permisos por wallet",
    text: "Cada operación tiene un responsable. El programa comprueba qué wallet puede emitir, actualizar o reclamar una garantía.",
    icon: "lock",
  },
];
function Icon({ kind = "document" }: { kind?: string }) {
  const paths: Record<string, string> = {
    document: "M7 3h7l4 4v14H7z M14 3v5h4 M10 12h5 M10 16h5",
    search: "M16 16l5 5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
    chat: "M3 4h18v13H9l-6 4z M7 9h10 M7 13h6",
    lock: "M5 10h14v11H5z M8 10V7a4 4 0 0 1 8 0v3 M12 14v3",
    check: "M5 12l4 4L19 6",
  };
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[kind] || paths.document} />
    </svg>
  );
}
export function HomePage() {
  const root = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState(false);
  const [active, setActive] = useState(0);
  useLayoutEffect(() => {
    if (!root.current || matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;

    const lenis = new Lenis({
      autoRaf: false,
      smoothWheel: true,
      lerp: 0.09,
      anchors: true,
    });
    const tick = (time: number) => lenis.raf(time * 1000);
    const syncScroll = () => ScrollTrigger.update();
    lenis.on("scroll", syncScroll);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      gsap.set(".sw-scroll-progress", { scaleX: 0, transformOrigin: "left center" });
      gsap.timeline({ defaults: { ease: "power3.out" } })
        .from(".sw-nav", { y: -70, autoAlpha: 0, duration: 0.85 }, 0)
        .from(".sw-hero-meta span", { y: 20, autoAlpha: 0, stagger: 0.1, duration: 0.7 }, 0.2)
        .from(".sw-title > span", { y: 90, autoAlpha: 0, stagger: 0.14, duration: 1.25 }, 0.3)
        .from(".sw-scene", { scale: 0.7, rotation: -12, autoAlpha: 0, duration: 1.6 }, 0.2)
        .from(".sw-hero .sw-lede, .sw-hero .sw-actions", { y: 36, autoAlpha: 0, stagger: 0.12, duration: 0.9 }, 0.9);

      gsap.to(".sw-marquee > div", { xPercent: -50, duration: 22, repeat: -1, ease: "none" });
      gsap.to(".sw-scroll-progress", {
        scaleX: 1, ease: "none",
        scrollTrigger: { trigger: root.current, start: "top top", end: "bottom bottom", scrub: 0.2 },
      });
      gsap.to(".sw-hero-visual", {
        yPercent: 22, ease: "none",
        scrollTrigger: { trigger: ".sw-hero", start: "top top", end: "bottom top", scrub: 1 },
      });
      gsap.to(".sw-orbit-one", {
        rotation: "+=360", duration: 36, repeat: -1, ease: "none",
      });
      gsap.to(".sw-orbit-two", {
        rotation: "-=360", duration: 30, repeat: -1, ease: "none",
      });
      gsap.to(".sw-orbit-one", {
        rotationX: 24, rotationY: -14, duration: 7, yoyo: true, repeat: -1, ease: "sine.inOut",
      });
      gsap.to(".sw-orbit-two", {
        rotationX: -22, rotationY: 16, duration: 8, yoyo: true, repeat: -1, ease: "sine.inOut",
      });
      gsap.to(".sw-title", {
        yPercent: -13, ease: "none",
        scrollTrigger: { trigger: ".sw-hero", start: "top top", end: "bottom top", scrub: 1 },
      });
      gsap.fromTo(".sw-progress span", { width: "0%" }, {
        width: "100%", ease: "none",
        scrollTrigger: { trigger: ".sw-process", start: "top 75%", end: "bottom 25%", scrub: 0.5 },
      });

      root.current?.querySelectorAll<HTMLElement>(".sw-section-index").forEach((index) => {
        gsap.from(index, {
          y: 24, autoAlpha: 0, duration: 0.8, ease: "power3.out",
          scrollTrigger: { trigger: index, start: "top 88%", once: true },
        });
        const line = index.querySelector("i");
        if (line) gsap.from(line, {
          scaleX: 0, transformOrigin: "left center", duration: 1.15, ease: "power2.out",
          scrollTrigger: { trigger: index, start: "top 85%", once: true },
        });
      });
      root.current?.querySelectorAll<HTMLElement>(".sw-section h2").forEach((heading) => {
        gsap.from(heading, {
          y: 80, autoAlpha: 0, duration: 1.1, ease: "power3.out",
          scrollTrigger: { trigger: heading, start: "top 82%", once: true },
        });
      });
      gsap.from(".sw-step", {
        y: 90, autoAlpha: 0, stagger: 0.14, duration: 0.95, ease: "power3.out",
        scrollTrigger: { trigger: ".sw-steps", start: "top 82%", once: true },
      });
      gsap.from(".sw-feature-tabs button", {
        x: -45, autoAlpha: 0, stagger: 0.08, duration: 0.7, ease: "power3.out",
        scrollTrigger: { trigger: ".sw-feature-tabs", start: "top 85%", once: true },
      });
      gsap.from(".sw-ledger-row", {
        x: 75, autoAlpha: 0, stagger: 0.14, duration: 0.85, ease: "power3.out",
        scrollTrigger: { trigger: ".sw-ledger", start: "top 78%", once: true },
      });
      gsap.from(".sw-final .sw-actions", {
        y: 40, autoAlpha: 0, duration: 0.8, ease: "power3.out",
        scrollTrigger: { trigger: ".sw-final .sw-actions", start: "top 90%", once: true },
      });

      media.add("(min-width: 801px)", () => {
        gsap.to(".sw-feature-canvas", {
          y: -48, ease: "none",
          scrollTrigger: { trigger: ".sw-features", start: "top bottom", end: "bottom top", scrub: 0.8 },
        });
        ScrollTrigger.create({
          trigger: ".sw-features", start: "top top", end: "bottom bottom",
          onUpdate: (self) => setActive(Math.min(3, Math.floor(self.progress * 4))),
        });
      });
    }, root);
    const refresh = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => {
      cancelAnimationFrame(refresh);
      context.revert();
      media.revert();
      lenis.off("scroll", syncScroll);
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);
  useEffect(() => {
    const section = root.current?.querySelector<HTMLElement>("#funciones");
    if (!section) return;
    const keyboard = (event: KeyboardEvent) => {
      const tabs = Array.from(
        section.querySelectorAll<HTMLButtonElement>("[role=tab]"),
      );
      const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
      if (current < 0) return;
      let next = current;
      if (event.key === "ArrowDown" || event.key === "ArrowRight")
        next = (current + 1) % 4;
      else if (event.key === "ArrowUp" || event.key === "ArrowLeft")
        next = (current + 3) % 4;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = 3;
      else return;
      event.preventDefault();
      tabs[next].focus();
      tabs[next].click();
    };
    section.addEventListener("keydown", keyboard);
    return () => {
      section.removeEventListener("keydown", keyboard);
    };
  }, []);
  return (
    <div className="sw" ref={root}>
      <div className="sw-scroll-progress" aria-hidden="true" />
      <header className="sw-nav">
        <div className="sw-container sw-nav-inner">
          <Link to="/" aria-label="SolWarranty, inicio" className="sw-logo">
            <img
              src="/img/SolWarranty_logo.svg"
              alt="SolWarranty"
              width="210"
              height="31"
            />
          </Link>
          <nav
            className={menu ? "sw-links is-open" : "sw-links"}
            aria-label="Navegación principal"
          >
            <a href="#como-funciona" onClick={() => setMenu(false)}>
              <small>01</small> Cómo funciona
            </a>
            <a href="#funciones" onClick={() => setMenu(false)}>
              <small>02</small> Funciones
            </a>
            <a href="#solana" onClick={() => setMenu(false)}>
              <small>03</small> Solana
            </a>
            <Link to="/verify"><small>04</small> Verificar</Link>
          </nav>
          <div className="sw-nav-actions">
            <WalletButton />
            <button
              className="sw-menu"
              aria-label={menu ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? "✕" : "☰"}
            </button>
          </div>
        </div>
      </header>
      <section className="sw-hero sw-container">
        <div className="sw-hero-meta" aria-hidden="true">
          <span>— 01<br />.SOLWARRANTY OS<br />.01 &gt; EMITE<br />.02 &gt; VERIFICA<br />.03 &gt; RECLAMA</span>
          <span>(...) SINCRONIZANDO REGISTROS ......▮</span>
          <span>© {new Date().getFullYear()} SOLWARRANTY<br />&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;</span>
        </div>
        <div className="sw-hero-copy">
          <div className="sw-kicker">
            <span className="sw-dot" /> Garantías digitales en Solana
          </div>
          <h1 className="sw-title">
            <span>GARANTÍAS</span>
            <span>QUE PUEDES</span>
            <span><mark>VERIFICAR.</mark></span>
          </h1>
          <p className="sw-lede">
            Lo que compras merece un respaldo.
            <br />
            Emite, consulta y gestiona garantías de productos con un registro
            verificable en Solana.
          </p>
          <div className="sw-actions">
            <Link className="sw-button" to="/verify">
              ▶ VERIFICAR GARANTÍA
            </Link>
            <Link className="sw-button sw-button-outline" to="/store">
              SOY UNA TIENDA ↗
            </Link>
          </div>
          <div className="sw-hero-note">
            <span className="sw-solana-symbol">
              <i />
              <i />
              <i />
            </span>
            <span>
              Construido sobre Solana <b>·</b> Devnet
            </span>
          </div>
        </div>
        <div className="sw-hero-visual">
          <div className="sw-orbit sw-orbit-one" />
          <div className="sw-orbit sw-orbit-two" />
          <div className="sw-scene">
            <Suspense fallback={<div className="sw-scene-fallback">S</div>}>
              <Scene />
            </Suspense>
          </div>
          <span className="sw-visual-caption">SOLANA DEVNET / REGISTRO 001</span>
        </div>
        <div className="sw-hero-bottom">
          <span>DEL PAPEL A UN REGISTRO DIGITAL</span>
          <span className="sw-scroll-mark">
            Desliza para descubrir <i />
          </span>
          <span>PROTOTIPO EN DEVNET</span>
        </div>
      </section>
      <div className="sw-marquee" aria-hidden="true"><div>EMITE ✳ VERIFICA ✳ RECLAMA ✳ SOLANA ✳ EMITE ✳ VERIFICA ✳ RECLAMA ✳ SOLANA ✳</div></div>
      <section id="como-funciona" className="sw-section sw-process">
        <div className="sw-container">
          <div className="sw-section-index"><span>— 02</span><b>CÓMO FUNCIONA</b><i /><span>(03) PASOS</span></div>
          <div className="sw-section-heading" data-reveal>
            <h2>
              TRES PASOS.<br /><mark>CERO PAPELES.</mark>
            </h2>
          </div>
          <div className="sw-progress" aria-hidden="true"><span /></div>
          <div className="sw-steps">
            {[
              {
                title: "Emite.",
                body: "La tienda crea y activa una garantía digital asociada a la wallet de su cliente.",
                icon: "document",
                tag: "TIENDA",
                code: "store.create() → warranty.activate()",
              },
              {
                title: "Verifica.",
                body: "El comprador consulta el producto, la vigencia y el estado registrados en Solana.",
                icon: "search",
                tag: "COMPRADOR",
                code: "verify(id) → active | expired",
              },
              {
                title: "Reclama.",
                body: "El comprador presenta su solicitud y la tienda deja constancia de la resolución.",
                icon: "chat",
                tag: "AMBOS",
                code: "claim.open() → store.resolve()",
              },
            ].map((s, i) => (
              <article className="sw-step" key={s.title} data-reveal>
                <div className="sw-step-top">
                  <span>0{i + 1}</span>
                  <Icon kind={s.icon} />
                </div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
                <code>{s.code}</code>
                <span className="sw-step-tag">{s.tag}</span>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section id="funciones" className="sw-section sw-features">
        <div className="sw-container sw-section-index"><span>— 03</span><b>FUNCIONES</b><i /><span>(04) MÓDULOS</span></div>
        <div className="sw-container sw-feature-grid">
          <div data-reveal>
            <h2>
              CUATRO FORMAS<br />DE TENER<br />EL CONTROL.
            </h2>
            <div
              className="sw-feature-tabs"
              role="tablist"
              aria-label="Funciones"
            >
              {features.map((f, i) => (
                <button
                  key={f.label}
                  role="tab"
                  id={"feature-tab-" + i}
                  aria-selected={active === i}
                  aria-controls="feature-panel"
                  onClick={() => setActive(i)}
                  className={active === i ? "is-active" : ""}
                >
                  <small>.0{i + 1}&gt;</small>
                  <Icon kind={f.icon} />
                  <span>{f.label}</span>
                  <span className="sw-tab-sign">
                    {active === i ? "−" : "+"}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div
            className="sw-feature-stage"
            role="tabpanel"
            id="feature-panel"
            aria-labelledby={"feature-tab-" + active}
          >
            <div className="sw-feature-canvas">
              <Suspense fallback={null}>
                <Scene particles index={active} />
              </Suspense>
            </div>
            <div className="sw-feature-description" key={active}>
              <span className="sw-feature-counter">0{active + 1} / 04</span>
              <h3>{features[active].title}</h3>
              <p>{features[active].text}</p>
            </div>
          </div>
        </div>
      </section>
      <section id="solana" className="sw-section sw-chain">
        <div className="sw-container sw-section-index"><span>— 04</span><b>EN SOLANA</b><i /><span>(01) RED</span></div>
        <div className="sw-container sw-chain-grid">
          <div data-reveal>
            <h2>
              TU GARANTÍA.<br />SU HISTORIAL.<br /><mark>EN SOLANA.</mark>
            </h2>
            <p>
              La información se consulta directamente en la blockchain. Un
              programa escrito en Rust con Anchor comprueba los permisos de cada
              operación y la relación entre tienda, garantía y reclamación.
            </p>
            <a
              className="sw-text-link"
              href={explorer}
              target="_blank"
              rel="noreferrer"
            >
              Ver el programa en Solana Explorer ↗
            </a>
            <div className="sw-tech">
              <span>Solana</span>
              <span>Rust</span>
              <span>Anchor</span>
            </div>
          </div>
          <div className="sw-ledger" data-reveal>
            <div className="sw-ledger-head">
              <span className="sw-solana-symbol">
                <i />
                <i />
                <i />
              </span>
              <strong>Un historial conectado.</strong>
              <small>DEVNET</small>
            </div>
            {[
              {
                icon: "document",
                title: "Tienda",
                text: "Emite y administra",
                label: "Store",
              },
              {
                icon: "check",
                title: "Garantía",
                text: "Producto, comprador y vigencia",
                label: "Warranty",
              },
              {
                icon: "chat",
                title: "Reclamación",
                text: "Solicitud y resolución",
                label: "Claim",
              },
            ].map((item) => (
              <div className="sw-ledger-row" key={item.label}>
                <div className="sw-ledger-icon">
                  <Icon kind={item.icon} />
                </div>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
                <code>{item.label}</code>
              </div>
            ))}
            <p className="sw-ledger-foot">
              La wallet autoriza. El programa valida.
              <br />
              La blockchain conserva el registro.
            </p>
          </div>
        </div>
      </section>
      <section className="sw-section sw-final">
        <div className="sw-container sw-section-index"><span>— 05</span><b>EMPIEZA AQUÍ</b><i /><span>DEVNET / DEMO</span></div>
        <div className="sw-container" data-reveal>
          <h2>
            DEL PAPEL<br />A LO <mark>VERIFICABLE.</mark>
          </h2>
          <p>
            Explora un registro público o conecta tu wallet
            <br />
            para empezar como tienda o comprador.
          </p>
          <div className="sw-actions">
            <Link className="sw-button" to="/verify">
              Explorar verificación
            </Link>
            <WalletButton />
          </div>
          <div className="sw-role-links">
            <Link to="/store">Panel de tienda</Link>
            <Link to="/my-warranties">Mis garantías</Link>
          </div>
        </div>
      </section>
      <footer className="sw-footer sw-container">
        <div className="sw-footer-top">
          <Link to="/" className="sw-logo">
            <img
              src="/img/SolWarranty_logo.svg"
              alt="SolWarranty"
              width="210"
              height="31"
            />
          </Link>
          <span>Garantías digitales. Confianza verificable.</span>
          <a href={explorer} target="_blank" rel="noreferrer">
            Solana Explorer ↗
          </a>
        </div>
        <div className="sw-footer-bottom">
          <p>
            Prototipo académico en Solana Devnet. Usa fondos de prueba.
            <br />
            Un registro no certifica la identidad de una tienda, una compra ni
            la validez legal de una garantía.
          </p>
          <span>© {new Date().getFullYear()} SolWarranty</span>
        </div>
      </footer>
    </div>
  );
}
