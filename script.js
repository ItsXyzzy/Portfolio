/* ============================================================
   Craig Dowdall — Portfolio Interactivity
   ============================================================ */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----------------------------------------------------------
     1. PRELOADER — simulated progress + reveal
     ---------------------------------------------------------- */
  function initPreloader() {
    const preloader = document.createElement("div");
    preloader.className = "preloader";
    preloader.innerHTML =
      '<div class="preloader-count"><span class="num">0</span><span class="pct">%</span></div>' +
      '<div class="preloader-bar"></div>' +
      '<div class="preloader-label">Craig Dowdall</div>';
    document.body.appendChild(preloader);

    const numEl = preloader.querySelector(".num");
    const barEl = preloader.querySelector(".preloader-bar");

    function finish() {
      preloader.classList.add("done");
      document.body.style.overflow = "";
      preloader.addEventListener("transitionend", () => {
        preloader.style.display = "none";
      }, { once: true });
    }

    if (reduceMotion) {
      numEl.textContent = "100";
      barEl.style.width = "100%";
      finish();
      return;
    }

    let progress = 0;
    const tick = () => {
      progress += (100 - progress) * 0.09 + 0.6;
      if (progress >= 100) progress = 100;
      const flat = Math.floor(progress);
      numEl.textContent = flat;
      barEl.style.width = flat + "%";
      if (progress < 100) {
        requestAnimationFrame(tick);
      } else {
        setTimeout(finish, 250);
      }
    };
    requestAnimationFrame(tick);
  }

  /* ----------------------------------------------------------
     2. CUSTOM CURSOR
     ---------------------------------------------------------- */
  function initCursor() {
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const dot = document.createElement("div");
    const ring = document.createElement("div");
    dot.className = "cursor-dot";
    ring.className = "cursor-ring";
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    document.body.classList.add("cursor-hidden");

    let mx = -100, my = -100, rx = -100, ry = -100;
    let shown = false;

    window.addEventListener("mousemove", (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + "px";
      dot.style.top = my + "px";
      if (!shown) {
        shown = true;
        document.body.classList.remove("cursor-hidden");
      }
    });
    // ring trails
    (function loop() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.left = rx + "px";
      ring.style.top = ry + "px";
      requestAnimationFrame(loop);
    })();

    document.addEventListener("mouseover", (e) => {
      if (e.target.closest("a, button, .project-card, .form-control, .overlay-links a")) {
        document.body.classList.add("cursor-hover");
      }
    });
    document.addEventListener("mouseout", (e) => {
      if (e.target.closest("a, button, .project-card, .form-control, .overlay-links a")) {
        document.body.classList.remove("cursor-hover");
      }
    });
  }

  /* ----------------------------------------------------------
     3. BACK TO TOP — scroll progress ring
     ---------------------------------------------------------- */
  function initBackToTop() {
    const btn = document.getElementById("back-to-top");
    const bar = btn.querySelector(".btt-progress-bar");

    const R = 25;
    const CIRC = 2 * Math.PI * R;
    bar.style.strokeDasharray = CIRC.toFixed(2);
    bar.style.strokeDashoffset = CIRC.toFixed(2);

    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const pct = max > 0 ? Math.min(h.scrollTop / max, 1) : 0;
      bar.style.strokeDashoffset = (CIRC * (1 - pct)).toFixed(2);
      btn.classList.toggle("visible", h.scrollTop > 320);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    btn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* ----------------------------------------------------------
     4. THEME TOGGLE
     ---------------------------------------------------------- */
  function initTheme() {
    const btn = document.getElementById("theme-toggle");
    const saved = localStorage.getItem("cd-theme");
    if (saved === "dark") document.documentElement.setAttribute("data-theme", "dark");

    btn.addEventListener("click", () => {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      if (isDark) {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("cd-theme", "light");
      } else {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("cd-theme", "dark");
      }
    });
  }

  /* ----------------------------------------------------------
     5. MENU OVERLAY
     ---------------------------------------------------------- */
  function initMenu() {
    const btn = document.getElementById("menu-toggle");
    const overlay = document.getElementById("menu-overlay");
    const links = overlay.querySelectorAll("a");

    const open = () => {
      overlay.classList.add("open");
      document.body.classList.add("menu-open");
      // stagger link reveal
      links.forEach((l, i) => {
        l.style.transitionDelay = (0.15 + i * 0.09) + "s";
      });
      document.body.style.overflow = "hidden";
    };
    const close = () => {
      overlay.classList.remove("open");
      document.body.classList.remove("menu-open");
      document.body.style.overflow = "";
      // reverse stagger so links exit top-down in a tidy collapse
      links.forEach((l, i) => {
        l.style.transitionDelay = (links.length - 1 - i) * 0.05 + "s";
      });
    };
    btn.addEventListener("click", () => {
      overlay.classList.contains("open") ? close() : open();
    });
    links.forEach((l) => l.addEventListener("click", close));

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("open")) close();
    });
  }

  /* ----------------------------------------------------------
     6. REVEAL ON SCROLL
     ---------------------------------------------------------- */
  function initReveal() {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((el) => io.observe(el));
  }

  /* ----------------------------------------------------------
     7. HERO PARALLAX + PROJECT TILT
     ---------------------------------------------------------- */
  function initMotion() {
    if (reduceMotion) return;
    const hero = document.querySelector(".hero-headline");
    const eyebrow = document.querySelector(".hero-eyebrow");
    const desc = document.querySelector(".hero-desc");

    window.addEventListener("scroll", () => {
      const y = window.scrollY;
      if (hero && y < window.innerHeight) {
        hero.style.transform = `translateY(${y * 0.25}px)`;
      }
    }, { passive: true });

    // project card 3D tilt
    document.querySelectorAll(".project-card").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateX(${py * -4}deg) rotateY(${px * 5}deg) translateY(-8px)`;
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "";
      });
    });
  }

  /* ----------------------------------------------------------
     8. MAGNETIC BUTTONS
     ---------------------------------------------------------- */
  function initMagnetic() {
    if (reduceMotion) return;
    const targets = document.querySelectorAll(".form-submit-btn, .lightbox-nav-btn, .see-all-btn, .lightbox-action");
    targets.forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
      });
      el.addEventListener("mouseleave", () => { el.style.transform = ""; });
    });
  }

  /* ----------------------------------------------------------
     9. LIGHTBOX
     ---------------------------------------------------------- */
  function initLightbox() {
    const overlay = document.getElementById("project-lightbox");
    const closeBtn = document.getElementById("lightbox-close");
    const prevBtn = document.getElementById("lightbox-prev");
    const nextBtn = document.getElementById("lightbox-next");
    const counter = document.getElementById("lightbox-counter");
    const gallery = document.getElementById("lightbox-gallery");
    const lbNum = document.getElementById("lb-num");
    const lbTitle = document.getElementById("lb-title");
    const lbDesc = document.getElementById("lb-desc");
    const lbTags = document.getElementById("lb-tags");
    const lbActions = document.getElementById("lightbox-actions");

    const keys = Object.keys(projectData);
    let current = 0;

    function renderImages(list) {
      gallery.innerHTML = "";
      gallery.classList.toggle("single", list.length <= 1);
      list.forEach((src) => {
        const img = document.createElement("img");
        img.src = src;
        img.alt = "";
        img.loading = "lazy";
        img.onerror = () => {
          if (img.parentNode === gallery) {
            const fb = document.createElement("div");
            fb.className = "lightbox-fallback";
            fb.textContent = lbTitle.textContent.trim().slice(0, 1).toUpperCase();
            img.replaceWith(fb);
          }
        };
        gallery.appendChild(img);
      });
    }

    function open(key) {
      const idx = keys.indexOf(key);
      if (idx === -1) return;
      current = idx;
      populate(current);
      overlay.classList.add("open");
      document.body.style.overflow = "hidden";
      closeBtn.focus();
    }
    function close() {
      overlay.classList.remove("open");
      document.body.style.overflow = "";
    }
    function populate(i) {
      const d = projectData[keys[i]];
      lbNum.textContent = d.num;
      lbTitle.textContent = d.title;
      lbDesc.textContent = d.desc;
      lbTags.innerHTML = d.tags.map((t) => `<span>${t}</span>`).join("");

      const actions = [];
      if (d.live) actions.push(`<a class="lightbox-action primary" href="${d.live}" target="_blank" rel="noopener">Visit live ↗</a>`);
      if (d.github) actions.push(`<a class="lightbox-action ghost" href="${d.github}" target="_blank" rel="noopener">View source ↗</a>`);
      lbActions.innerHTML = actions.join("") || "";

      renderImages(d.images || []);
      counter.textContent = `${i + 1} / ${keys.length}`;
    }
    function step(dir) {
      current = (current + dir + keys.length) % keys.length;
      populate(current);
    }

    document.querySelectorAll(".project-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        // ignore clicks on the arrow link (could be repurposed)
        if (e.target.closest(".project-link")) return;
        open(card.getAttribute("data-project"));
      });
    });
    closeBtn.addEventListener("click", close);
    prevBtn.addEventListener("click", () => step(-1));
    nextBtn.addEventListener("click", () => step(1));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    window.addEventListener("keydown", (e) => {
      if (!overlay.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    });
  }

  /* ----------------------------------------------------------
     10. SMOOTH SCROLL FOR OVERLAY LINKS
     ---------------------------------------------------------- */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (id === "#") return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
      });
    });
  }

  /* ----------------------------------------------------------
     11. CONTACT FORM
     ---------------------------------------------------------- */
  function initForm() {
    const form = document.getElementById("portfolio-form");
    const btn = form.querySelector(".form-submit-btn");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      btn.classList.add("submitted");
      btn.textContent = "Message sent ✓";
      form.reset();
      setTimeout(() => {
        btn.classList.remove("submitted");
        btn.textContent = "Send Message →";
      }, 2600);
    });
  }

  /* ----------------------------------------------------------
     12. FOOTER YEAR
     ---------------------------------------------------------- */
  function initYear() {
    const f = document.querySelector("footer span:first-child");
    if (f) f.textContent = `© ${new Date().getFullYear()} Craig Dowdall`;
  }

  /* ----------------------------------------------------------
     BOOT
     ---------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    if (!reduceMotion) document.body.style.overflow = "hidden"; // lock while preloader runs
    initPreloader();
    initCursor();
    initBackToTop();
    initTheme();
    initMenu();
    initReveal();
    initMotion();
    initMagnetic();
    initLightbox();
    initSmoothScroll();
    initForm();
    initYear();
  });
})();
