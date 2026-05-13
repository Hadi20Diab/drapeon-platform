const slides = Array.from(document.querySelectorAll(".slide"));
const deck = document.getElementById("deck");
const progressBar = document.getElementById("progress-bar");
const slideCounter = document.getElementById("slide-counter");
const dotsHost = document.getElementById("slide-dots");
const prevButton = document.getElementById("prev-slide");
const nextButton = document.getElementById("next-slide");

let activeIndex = 0;

function formatCounter(index) {
  const current = String(index + 1).padStart(2, "0");
  const total = String(slides.length).padStart(2, "0");
  return `${current} / ${total}`;
}

function updateUI(index) {
  activeIndex = index;
  document.documentElement.style.setProperty(
    "--progress",
    `${((index + 1) / slides.length) * 100}%`
  );
  slideCounter.textContent = formatCounter(index);

  slides.forEach((slide, slideIndex) => {
    slide.classList.toggle("is-active", slideIndex === index);
  });

  Array.from(dotsHost.children).forEach((dot, dotIndex) => {
    dot.classList.toggle("is-active", dotIndex === index);
    dot.setAttribute("aria-current", dotIndex === index ? "true" : "false");
  });
}

function goToSlide(index) {
  const targetIndex = Math.max(0, Math.min(index, slides.length - 1));
  slides[targetIndex].scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
  updateUI(targetIndex);
}

function buildDots() {
  slides.forEach((slide, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "deck-nav__dot";
    dot.setAttribute("aria-label", `Go to slide ${index + 1}: ${slide.dataset.slideTitle || ""}`);
    dot.addEventListener("click", () => goToSlide(index));
    dotsHost.appendChild(dot);
  });
}

function bindControls() {
  prevButton.addEventListener("click", () => goToSlide(activeIndex - 1));
  nextButton.addEventListener("click", () => goToSlide(activeIndex + 1));

  document.querySelectorAll("[data-action='next']").forEach((button) => {
    button.addEventListener("click", () => goToSlide(activeIndex + 1));
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
      event.preventDefault();
      goToSlide(activeIndex + 1);
    }

    if (event.key === "ArrowUp" || event.key === "PageUp") {
      event.preventDefault();
      goToSlide(activeIndex - 1);
    }
  });
}

function observeSlides() {
  const slideObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.55) {
          const index = slides.indexOf(entry.target);
          if (index !== -1) {
            updateUI(index);
          }
        }
      });
    },
    {
      root: deck,
      threshold: [0.55, 0.7]
    }
  );

  slides.forEach((slide) => slideObserver.observe(slide));

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    {
      root: deck,
      threshold: 0.22
    }
  );

  document.querySelectorAll(".reveal").forEach((node) => revealObserver.observe(node));
}

function renderQrCode() {
  const qrNode = document.getElementById("demo-qr");
  const demoLink = document.getElementById("demo-link");
  const githubLink = document.getElementById("github-link");
  const demoUrl = document.body.dataset.demoUrl || "https://your-demo-url.com";
  const githubUrl = document.body.dataset.githubUrl || "https://github.com/your-account/drapeon";

  demoLink.href = demoUrl;
  demoLink.textContent = demoUrl.replace(/^https?:\/\//, "");
  githubLink.href = githubUrl;

  if (window.QRCode) {
    new QRCode(qrNode, {
      text: demoUrl,
      width: 180,
      height: 180,
      colorDark: "#111111",
      colorLight: "#F5F5F5",
      correctLevel: window.QRCode.CorrectLevel.H
    });
  } else {
    qrNode.textContent = "QR unavailable";
  }
}

buildDots();
bindControls();
observeSlides();
renderQrCode();
updateUI(0);
