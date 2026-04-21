const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.site-nav');
const navLinks = document.querySelectorAll('.site-nav a');
const siteHeader = document.querySelector('.site-header');
let scrollProgress = document.querySelector('[data-scroll-progress]');
const sections = document.querySelectorAll('main section');
const revealTargets = document.querySelectorAll(
  '.hero-copy > *, .logo-card, main > section, main section h2, .cards > *, .faq-item, .team-section-head, .team-featured-wrap, .team-preview-grid, .gallery-grid > *, #contacts .card'
);
const faqItems = document.querySelectorAll('[data-faq-item]');
const countTargets = document.querySelectorAll('[data-count]');
const factsToggle = document.querySelector('[data-facts-toggle]');
const factsPopup = document.querySelector('[data-facts-popup]');
const factsPanel = factsPopup?.querySelector('.facts-popup-panel');
const factsCloseButtons = document.querySelectorAll('[data-facts-close]');
const factsTabs = document.querySelectorAll('[data-facts-tab]');
const factsViews = document.querySelectorAll('[data-facts-view]');
const factsFooter = document.querySelector('[data-facts-footer]');
const reactionGame = document.querySelector('[data-reaction-game]');
const reactionSurface = document.querySelector('[data-reaction-surface]');
const reactionMessage = document.querySelector('[data-reaction-message]');
const reactionBest = document.querySelector('[data-reaction-best]');
const reactionLast = document.querySelector('[data-reaction-last]');
const reactionReset = document.querySelector('[data-reaction-reset]');

let factsCloseTimer = null;
let lastFocusedElement = null;
let reactionTimeout = null;
let reactionStartTime = 0;
let bestReaction = null;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!scrollProgress) {
  scrollProgress = document.createElement('div');
  scrollProgress.className = 'scroll-progress';
  scrollProgress.dataset.scrollProgress = '';
  scrollProgress.setAttribute('aria-hidden', 'true');
  document.body.prepend(scrollProgress);
}

function syncFactsExpanded(isOpen) {
  if (!factsToggle) return;
  factsToggle.setAttribute('aria-expanded', String(isOpen));
}

function openFactsPopup() {
  if (!factsPopup || !factsPanel) return;

  window.clearTimeout(factsCloseTimer);
  lastFocusedElement = document.activeElement;
  factsPopup.hidden = false;
  factsPopup.classList.remove('is-closing');
  document.body.classList.add('modal-open');
  syncFactsExpanded(true);

  requestAnimationFrame(() => {
    factsPanel.focus();
  });
}

function closeFactsPopup() {
  if (!factsPopup || factsPopup.hidden) return;

  window.clearTimeout(factsCloseTimer);
  factsPopup.classList.add('is-closing');
  document.body.classList.remove('modal-open');
  syncFactsExpanded(false);

  factsCloseTimer = window.setTimeout(() => {
    factsPopup.hidden = true;
    factsPopup.classList.remove('is-closing');
    if (lastFocusedElement instanceof HTMLElement) {
      lastFocusedElement.focus();
    }
  }, 320);
}

function setFactsView(viewName) {
  factsTabs.forEach((tab) => {
    const isActive = tab.dataset.factsTab === viewName;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  factsViews.forEach((view) => {
    const isActive = view.dataset.factsView === viewName;
    view.classList.toggle('is-active', isActive);
    view.setAttribute('aria-hidden', String(!isActive));
  });

  if (factsFooter) {
    factsFooter.classList.toggle('is-hidden', viewName !== 'facts');
    factsFooter.setAttribute('aria-hidden', String(viewName !== 'facts'));
  }
}

function clearReactionTimer() {
  if (reactionTimeout) {
    window.clearTimeout(reactionTimeout);
    reactionTimeout = null;
  }
}

function formatReactionTime(value) {
  return `${value} мс`;
}

function syncReactionStats(lastResult) {
  if (reactionBest) {
    reactionBest.textContent = bestReaction === null ? '—' : formatReactionTime(bestReaction);
  }

  if (reactionLast) {
    reactionLast.textContent = lastResult ?? '—';
  }
}

function setReactionState(state, message) {
  if (!reactionGame || !reactionMessage) return;
  reactionGame.dataset.gameState = state;
  reactionMessage.textContent = message;
}

function resetReactionGame() {
  clearReactionTimer();
  reactionStartTime = 0;
  setReactionState('idle', 'Нажми, чтобы начать. Когда цвет сменится на яркий, нажми как можно быстрее.');
  syncReactionStats(null);
}

function scheduleReactionRound() {
  clearReactionTimer();
  reactionStartTime = 0;
  setReactionState('waiting', 'Жди... не нажимай раньше времени.');

  const delay = 1400 + Math.floor(Math.random() * 2600);
  reactionTimeout = window.setTimeout(() => {
    reactionStartTime = performance.now();
    setReactionState('ready', 'Жми сейчас!');
  }, delay);
}

if (factsToggle) {
  factsToggle.addEventListener('click', () => {
    if (factsPopup?.hidden === false) {
      closeFactsPopup();
      return;
    }

    openFactsPopup();
  });
}

factsCloseButtons.forEach((button) => {
  button.addEventListener('click', closeFactsPopup);
});

factsTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    setFactsView(tab.dataset.factsTab);
  });
});

if (factsPopup) {
  factsPopup.addEventListener('click', (event) => {
    if (event.target === factsPopup) {
      closeFactsPopup();
    }
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && factsPopup && !factsPopup.hidden) {
    closeFactsPopup();
  }
});

if (reactionSurface) {
  reactionSurface.addEventListener('click', () => {
    if (!reactionGame) return;

    const state = reactionGame.dataset.gameState;

    if (state === 'idle' || state === 'result' || state === 'too-soon') {
      scheduleReactionRound();
      return;
    }

    if (state === 'waiting') {
      clearReactionTimer();
      setReactionState('too-soon', 'Слишком рано. Нажми ещё раз, чтобы начать заново.');
      syncReactionStats('слишком рано');
      return;
    }

    if (state === 'ready') {
      const reactionTime = Math.round(performance.now() - reactionStartTime);
      bestReaction = bestReaction === null ? reactionTime : Math.min(bestReaction, reactionTime);
      setReactionState('result', `Твоя реакция: ${formatReactionTime(reactionTime)}. Нажми, чтобы сыграть ещё раз.`);
      syncReactionStats(formatReactionTime(reactionTime));
    }
  });
}

if (reactionReset) {
  reactionReset.addEventListener('click', () => {
    bestReaction = null;
    resetReactionGame();
  });
}

resetReactionGame();
setFactsView('facts');

if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });
}

navLinks.forEach((link) => {
  link.addEventListener('click', () => {
    if (nav && navToggle) {
      nav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });
});

function syncScrollUi() {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? scrollTop / scrollable : 0;

  siteHeader?.classList.toggle('is-scrolled', scrollTop > 18);

  if (scrollProgress) {
    scrollProgress.style.transform = `scaleX(${Math.min(Math.max(progress, 0), 1)})`;
  }
}

window.addEventListener('scroll', syncScrollUi, { passive: true });
window.addEventListener('resize', () => {
  syncScrollUi();
  faqItems.forEach((item) => {
    if (!item.classList.contains('is-open')) return;
    const panel = item.querySelector('[data-faq-panel]');
    if (panel) {
      panel.style.maxHeight = `${panel.scrollHeight}px`;
    }
  });
});
syncScrollUi();

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (event) => {
    const targetId = anchor.getAttribute('href');
    if (!targetId || targetId === '#') return;

    const target = document.querySelector(targetId);
    if (!target) return;

    event.preventDefault();
    const headerOffset = siteHeader?.offsetHeight ?? 0;
    const targetTop = target.getBoundingClientRect().top + window.scrollY - headerOffset - 18;

    window.scrollTo({
      top: Math.max(targetTop, 0),
      behavior: reduceMotion ? 'auto' : 'smooth',
    });

    history.pushState(null, '', targetId);
  });
});

document.querySelectorAll('a[href$=".html"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    if (!document.startViewTransition || reduceMotion || link.target || event.metaKey || event.ctrlKey) return;

    const href = link.getAttribute('href');
    if (!href) return;

    event.preventDefault();
    document.startViewTransition(() => {
      window.location.href = href;
    });
  });
});

function setFaqOpen(item, shouldOpen) {
  const button = item.querySelector('.faq-question');
  const panel = item.querySelector('[data-faq-panel]');
  if (!button || !panel) return;

  item.classList.toggle('is-open', shouldOpen);
  button.setAttribute('aria-expanded', String(shouldOpen));
  panel.setAttribute('aria-hidden', String(!shouldOpen));
  panel.style.maxHeight = shouldOpen ? `${panel.scrollHeight}px` : '0px';
}

faqItems.forEach((item) => {
  const button = item.querySelector('.faq-question');
  if (!button) return;

  setFaqOpen(item, item.classList.contains('is-open'));

  button.addEventListener('click', () => {
    const isOpen = item.classList.contains('is-open');

    faqItems.forEach((faqItem) => {
      setFaqOpen(faqItem, false);
    });

    if (!isOpen) {
      setFaqOpen(item, true);

      requestAnimationFrame(() => {
        const rect = item.getBoundingClientRect();
        const offsetTop = rect.top + window.scrollY;
        const isOutsideViewport = rect.top < 96 || rect.bottom > window.innerHeight - 28;

        if (isOutsideViewport) {
          window.scrollTo({
            top: Math.max(offsetTop - 110, 0),
            behavior: 'smooth',
          });
        }
      });
    }
  });
});

function prepareRevealTargets() {
  const targets = [...new Set([...revealTargets])].filter(Boolean);
  const staggerStep =
    Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--stagger-step')) || 0.1;

  targets.forEach((target) => {
    target.classList.add('reveal');
  });

  document.querySelectorAll('.cards, .faq-list, .team-preview-grid, .gallery-grid').forEach((group) => {
    [...group.children].forEach((child, index) => {
      child.style.setProperty('--reveal-delay', `${Math.min(index * staggerStep, 0.45)}s`);
    });
  });

  return targets;
}

const revealElements = prepareRevealTargets();

if (reduceMotion || !('IntersectionObserver' in window)) {
  revealElements.forEach((target) => target.classList.add('visible', 'reveal-visible'));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible', 'reveal-visible');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.14, rootMargin: '0px 0px -8% 0px' }
  );

  revealElements.forEach((target) => observer.observe(target));
}

function animateCount(target) {
  const endValue = Number.parseFloat(target.dataset.count || '0');
  if (!Number.isFinite(endValue)) return;

  if (reduceMotion) {
    target.textContent = String(endValue);
    return;
  }

  const duration = 900;
  const startTime = performance.now();

  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    target.textContent = String(Math.round(endValue * eased));

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}

if (countTargets.length) {
  if (reduceMotion || !('IntersectionObserver' in window)) {
    countTargets.forEach(animateCount);
  } else {
    const countObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCount(entry.target);
          countObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.55 }
    );

    countTargets.forEach((target) => countObserver.observe(target));
  }
}

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      navLinks.forEach((link) => {
        const active = link.getAttribute('href') === `#${id}`;
        link.classList.toggle('active', active);
      });
    });
  },
  { threshold: 0.45 }
);

sections.forEach((section) => sectionObserver.observe(section));
