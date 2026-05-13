const AI_DEMO_MODE = 'live'; // 'live' or 'fallback'

const slides = Array.from(document.querySelectorAll('.slide'));
const deck = document.getElementById('deck');
const slideCounter = document.getElementById('slide-counter');
const dotsHost = document.getElementById('slide-dots');
const prevButton = document.getElementById('prev-slide');
const nextButton = document.getElementById('next-slide');
const promptButtons = Array.from(document.querySelectorAll('[data-prompt-index]'));
const aiResponseNode = document.querySelector('#ai-chat-response p');
const aiProductsNode = document.getElementById('ai-demo-products');
const aiLiveDemoNode = document.getElementById('ai-demo-live');
const aiFallbackDemoNode = document.getElementById('ai-demo-fallback');
const inspirationToggle = document.getElementById('inspiration-toggle');
const inspirationAnswer = document.getElementById('inspiration-answer');

let activeIndex = 0;
let typingTimer = null;

const demoScenarios = [
  {
    prompt: 'I need a sharp black-tie suit under $250.',
    response:
      'I would guide the user toward structured black evening suits with clean shoulders, a narrow lapel line, and verified budget fit. The response stays grounded to live catalog inventory and explains why each option matches the event.',
    products: [
      {
        title: 'Slim Midnight Formal Suit',
        store: 'Malik Haddad Atelier',
        image: 'https://images.unsplash.com/photo-1593032465175-481ac7f401a0?auto=format&fit=crop&w=1200&q=85'
      },
      {
        title: 'Heritage Wool Tuxedo',
        store: 'Mira Farah Atelier',
        image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=1200&q=85'
      }
    ]
  },
  {
    prompt: 'Find a fitting-ready dress for an engagement dinner.',
    response:
      'The assistant can prioritize elegant evening dresses that align with the customer body profile, surface fitting availability, and suggest the strongest designer options before the request is sent.',
    products: [
      {
        title: 'Satin Evening Column',
        store: 'Aya Farah Atelier',
        image: 'https://images.pexels.com/photos/19895956/pexels-photo-19895956.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&fit=crop'
      },
      {
        title: 'Structured Cocktail Dress',
        store: 'Lina Studio',
        image: 'https://images.pexels.com/photos/19895964/pexels-photo-19895964.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&fit=crop'
      }
    ]
  },
  {
    prompt: 'Explain how fittings work on Drapeon.',
    response:
      'The customer selects a product, requests a fitting session, and the designer confirms or declines the slot. That workflow is tracked inside both dashboards so the experience feels concierge-led instead of anonymous checkout.',
    products: [
      {
        title: 'Designer Calendar Workflow',
        store: 'Operations View',
        image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=85'
      },
      {
        title: 'Client Booking Journey',
        store: 'Customer Experience',
        image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=85'
      }
    ]
  }
];

function formatCounter(index) {
  const current = String(index + 1).padStart(2, '0');
  const total = String(slides.length).padStart(2, '0');
  return `${current} / ${total}`;
}

function updateUI(index) {
  activeIndex = index;
  document.documentElement.style.setProperty('--progress', `${((index + 1) / slides.length) * 100}%`);
  slideCounter.textContent = formatCounter(index);

  slides.forEach((slide, slideIndex) => {
    slide.classList.toggle('is-active', slideIndex === index);
  });

  Array.from(dotsHost.children).forEach((dot, dotIndex) => {
    dot.classList.toggle('is-active', dotIndex === index);
    dot.setAttribute('aria-current', dotIndex === index ? 'true' : 'false');
  });
}

function goToSlide(index) {
  const targetIndex = Math.max(0, Math.min(index, slides.length - 1));
  slides[targetIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
  updateUI(targetIndex);
}

function buildDots() {
  slides.forEach((slide, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'deck-nav__dot';
    dot.setAttribute('aria-label', `Go to slide ${index + 1}: ${slide.dataset.slideTitle || ''}`);
    dot.addEventListener('click', () => goToSlide(index));
    dotsHost.appendChild(dot);
  });
}

function bindControls() {
  prevButton.addEventListener('click', () => goToSlide(activeIndex - 1));
  nextButton.addEventListener('click', () => goToSlide(activeIndex + 1));

  document.querySelectorAll("[data-action='next']").forEach((button) => {
    button.addEventListener('click', () => goToSlide(activeIndex + 1));
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') {
      event.preventDefault();
      goToSlide(activeIndex + 1);
    }

    if (event.key === 'ArrowUp' || event.key === 'PageUp') {
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
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    {
      root: deck,
      threshold: 0.22
    }
  );

  document.querySelectorAll('.reveal').forEach((node) => revealObserver.observe(node));
}

function renderQrCode(nodeId, url) {
  const qrNode = document.getElementById(nodeId);
  if (!qrNode) {
    return;
  }

  qrNode.innerHTML = '';

  if (window.QRCode) {
    new QRCode(qrNode, {
      text: url,
      width: 180,
      height: 180,
      colorDark: '#111111',
      colorLight: '#F5F5F5',
      correctLevel: window.QRCode.CorrectLevel.H
    });
  } else {
    qrNode.textContent = 'QR unavailable';
  }
}

function hydrateLinks() {
  const demoUrl = document.body.dataset.demoUrl || 'https://your-demo-url.com';
  const githubUrl = document.body.dataset.githubUrl || 'https://github.com/your-account/drapeon';
  const portfolioUrl = document.body.dataset.portfolioUrl || 'https://your-portfolio-url.com';

  const demoLink = document.getElementById('final-demo-link');
  const aiLiveDemoLink = document.getElementById('ai-live-demo-link');
  const githubLink = document.getElementById('github-link');
  const portfolioLink = document.getElementById('portfolio-link');

  if (demoLink) {
    demoLink.href = demoUrl;
  }

  if (aiLiveDemoLink) {
    aiLiveDemoLink.href = demoUrl;
  }

  if (githubLink) {
    githubLink.href = githubUrl;
  }

  if (portfolioLink) {
    portfolioLink.href = portfolioUrl;
    portfolioLink.textContent = portfolioUrl.replace(/^https?:\/\//, '');
  }

  renderQrCode('demo-qr', demoUrl);
  renderQrCode('portfolio-qr', portfolioUrl);
}

function renderProducts(products) {
  if (!aiProductsNode) {
    return;
  }

  aiProductsNode.innerHTML = products
    .map(
      (product) => `
        <article class="ai-demo__product">
          <img src="${product.image}" alt="${product.title}" />
          <div class="ai-demo__product-copy">
            <strong>${product.title}</strong>
            <span>${product.store}</span>
          </div>
        </article>
      `
    )
    .join('');
}

function typeResponse(text) {
  if (!aiResponseNode) {
    return;
  }

  if (typingTimer) {
    window.clearInterval(typingTimer);
  }

  aiResponseNode.textContent = '';
  let index = 0;

  typingTimer = window.setInterval(() => {
    aiResponseNode.textContent = text.slice(0, index + 1);
    index += 2;

    if (index >= text.length) {
      aiResponseNode.textContent = text;
      window.clearInterval(typingTimer);
      typingTimer = null;
    }
  }, 18);
}

function loadScenario(index) {
  const scenario = demoScenarios[index];
  const userBubble = document.querySelector('.ai-chat__message--user p');

  if (!userBubble) {
    return;
  }

  promptButtons.forEach((button, buttonIndex) => {
    button.classList.toggle('is-active', buttonIndex === index);
  });

  userBubble.textContent = scenario.prompt;
  renderProducts(scenario.products);
  typeResponse(scenario.response);
}

function bindAiDemo() {
  if (AI_DEMO_MODE === 'live') {
    aiFallbackDemoNode?.classList.add('is-hidden');
    aiLiveDemoNode?.classList.remove('is-hidden');
    return;
  }

  aiLiveDemoNode?.classList.add('is-hidden');
  aiFallbackDemoNode?.classList.remove('is-hidden');

  promptButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.promptIndex || 0);
      loadScenario(index);
    });
  });

  loadScenario(0);
}

function bindInspirationToggle() {
  if (!inspirationToggle || !inspirationAnswer) {
    return;
  }

  inspirationToggle.addEventListener('click', () => {
    const open = inspirationAnswer.classList.toggle('is-open');
    inspirationToggle.textContent = open ? 'Hide the answer' : 'Reveal the inspiration';
  });
}

buildDots();
bindControls();
observeSlides();
hydrateLinks();
bindAiDemo();
bindInspirationToggle();
updateUI(0);
