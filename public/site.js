(() => {
  'use strict';

  let data;
  try { data = JSON.parse(document.getElementById('site-data')?.textContent || '{}'); }
  catch { data = {}; }
  const photos = data.photos && typeof data.photos === 'object' ? data.photos : {};
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fallbackUi = {
    lightbox: {
      closeLabel: 'Close photograph',
      previousLabel: 'Previous photograph',
      nextLabel: 'Next photograph',
      counterTemplate: '{index} / {total}'
    },
    slideshow: {
      playLabel: 'Play automatic slideshow',
      pauseLabel: 'Pause automatic slideshow'
    },
    portfolio: {
      oneResultTemplate: 'Showing {count} photograph.',
      manyResultsTemplate: 'Showing {count} photographs.',
      emptyMessage: 'There are no photographs in this collection yet.'
    },
    inquiry: {
      submitLabel: 'Send my inquiry',
      sendingButtonLabel: 'Sending my inquiry…',
      sentButtonLabel: 'Inquiry sent',
      sendingMessage: 'Sending your inquiry…',
      successMessage: 'Your inquiry has been sent to me. Thank you for getting in touch. This does not reserve a date; we’ll confirm the details together before you book.',
      alreadySentMessage: 'Your inquiry has already been sent. Sending an inquiry does not reserve a date.',
      tooLongMessage: 'Please shorten your note a little before sending. Your details are still here.',
      expiredMessage: 'Please try sending your inquiry again. Your details are still here.',
      rateLimitMessage: 'Please wait a little before trying again, or email me directly. Your details are still here.',
      validationMessage: 'Please check your name, email address, and note, then try sending your inquiry again. Your details are still here.',
      failureMessage: 'I couldn’t confirm that your inquiry was sent. Your details are still here. Please try again or email me directly.',
      characterLimitTemplate: 'Please use {limit} characters or fewer.',
      nameRequiredMessage: 'Please enter your name.',
      emailRequiredMessage: 'Please enter your email address.',
      emailInvalidMessage: 'Please enter a valid email address so I can reply.',
      requiredMessage: 'Please complete this field.'
    }
  };
  const ui = Object.fromEntries(Object.entries(fallbackUi).map(([section, fields]) => [
    section,
    Object.fromEntries(Object.entries(fields).map(([key, fallback]) => {
      const value = data.ui?.[section]?.[key];
      const optional = section === 'lightbox' && key === 'counterTemplate';
      return [key, typeof value === 'string' && (value.trim() || (optional && value === '')) ? value : fallback];
    }))
  ]));

  function formatText(template, values) {
    return template.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g, (token, key) => (
      Object.hasOwn(values, key) ? String(values[key]) : token
    ));
  }

  function safeImageUrl(value) {
    const raw = String(value || '');
    if (!raw || /[\u0000-\u001f\u007f\\]/.test(raw)) return '';
    if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
    try {
      const url = new URL(raw);
      return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
    } catch { return ''; }
  }

  function initLightbox() {
    const dialog = document.getElementById('image-dialog');
    if (!dialog || typeof dialog.showModal !== 'function') return;
    let lastTrigger = null;
    let activeKeys = [];
    let activeIndex = 0;
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'dialog-close';
    close.setAttribute('aria-label', ui.lightbox.closeLabel);
    close.textContent = '×';
    const previous = document.createElement('button');
    previous.type = 'button';
    previous.className = 'image-prev';
    previous.setAttribute('aria-label', ui.lightbox.previousLabel);
    previous.textContent = '←';
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'image-next';
    next.setAttribute('aria-label', ui.lightbox.nextLabel);
    next.textContent = '→';
    const image = document.createElement('img');
    image.decoding = 'async';
    const caption = document.createElement('p');
    caption.setAttribute('aria-live', 'polite');
    const captionText = document.createTextNode('');
    const counter = document.createElement('span');
    counter.className = 'image-counter';
    caption.append(captionText, counter);
    dialog.replaceChildren(close, previous, next, image, caption);

    function showPhoto(key, trigger) {
      if (!Object.hasOwn(photos, key)) return;
      const photo = photos[key];
      const src = safeImageUrl(photo.src);
      if (!src) return;
      if (trigger) {
        lastTrigger = trigger;
        activeKeys = [...new Set([...document.querySelectorAll('main [data-photo]')]
          .filter(button => !button.hidden && button.getClientRects().length)
          .map(button => button.dataset.photo)
          .filter(photoKey => Object.hasOwn(photos, photoKey) && safeImageUrl(photos[photoKey].src)))];
      }
      activeIndex = activeKeys.indexOf(key);
      image.src = src;
      image.alt = String(photo.alt || '');
      captionText.textContent = String(photo.alt || '');
      const counterText = activeKeys.length > 1
        ? formatText(ui.lightbox.counterTemplate, {index: activeIndex + 1, total: activeKeys.length}) : '';
      counter.textContent = counterText ? ` ${counterText}` : '';
      previous.hidden = next.hidden = activeKeys.length < 2;
      if (!dialog.open) dialog.showModal();
    }
    function move(direction) {
      if (activeKeys.length > 1) showPhoto(activeKeys[(activeIndex + direction + activeKeys.length) % activeKeys.length]);
    }
    document.querySelectorAll('main [data-photo]').forEach(button => {
      button.addEventListener('click', () => showPhoto(button.dataset.photo, button));
    });
    close.addEventListener('click', () => dialog.close());
    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    dialog.addEventListener('close', () => { if (lastTrigger?.isConnected && !lastTrigger.hidden) lastTrigger.focus(); });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    dialog.addEventListener('keydown', event => {
      if (!dialog.open || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      move(event.key === 'ArrowLeft' ? -1 : 1);
    });
  }

  function initHero() {
    const hero = document.querySelector('.visual-hero[data-hero-carousel]')
      || document.querySelector('.visual-hero[aria-roledescription="carousel"]');
    if (!hero) return;
    const slides = [...hero.querySelectorAll('[data-hero-slide]')];
    const controls = hero.querySelector('.hero-controls');
    if (slides.length < 2 || !controls) return;
    controls.hidden = false;
    const pauseControl = controls.querySelector('[data-hero-pause]');
    let index = Math.max(0, slides.findIndex(slide => slide.classList.contains('is-active')));
    let paused = reducedMotion.matches;
    let hovered = false;
    let focused = false;
    let timer;
    function schedule() {
      clearInterval(timer);
      if (paused || hovered || focused || document.hidden) return;
      timer = setInterval(() => {
        if (!document.querySelector('dialog[open]')) move(1, false);
      }, 5000);
    }
    function move(direction, manual = true) {
      index = (index + direction + slides.length) % slides.length;
      slides.forEach((slide, slideIndex) => {
        slide.classList.toggle('is-active', slideIndex === index);
        slide.setAttribute('aria-hidden', String(slideIndex !== index));
      });
      if (manual) schedule();
    }
    function update() {
      pauseControl.setAttribute('aria-label', paused ? ui.slideshow.playLabel : ui.slideshow.pauseLabel);
      pauseControl.setAttribute('aria-pressed', String(paused));
      pauseControl.querySelector('span').textContent = paused ? '▷' : 'Ⅱ';
      schedule();
    }
    controls.querySelector('[data-hero-prev]').addEventListener('click', () => move(-1));
    controls.querySelector('[data-hero-next]').addEventListener('click', () => move(1));
    pauseControl.addEventListener('click', () => {
      paused = !paused;
      if (!paused) { hovered = false; focused = false; }
      update();
    });
    hero.addEventListener('mouseenter', () => { hovered = true; schedule(); });
    hero.addEventListener('mouseleave', () => { hovered = false; schedule(); });
    hero.addEventListener('focusin', () => { focused = true; schedule(); });
    hero.addEventListener('focusout', event => { focused = hero.contains(event.relatedTarget); schedule(); });
    document.addEventListener('visibilitychange', schedule);
    window.addEventListener('pagehide', () => clearInterval(timer));
    window.addEventListener('pageshow', schedule);
    reducedMotion.addEventListener?.('change', event => {
      if (event.matches) { paused = true; update(); }
    });
    update();
  }

  function initFilters() {
    const controls = document.querySelector('.gallery-filters');
    const grid = document.querySelector('#portfolio-images .portfolio-grid');
    if (!grid) return;
    const images = [...grid.querySelectorAll('[data-photo]')];
    const empty = document.querySelector('[data-portfolio-empty]');
    function updateEmpty(visibleCount) {
      if (!empty) return;
      empty.textContent = ui.portfolio.emptyMessage;
      empty.hidden = visibleCount > 0;
    }
    updateEmpty(images.filter(image => !image.hidden).length);
    if (!controls) return;
    controls.hidden = false;
    const buttons = [...controls.querySelectorAll('[data-filter]')];
    buttons.forEach(button => button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      buttons.forEach(control => control.setAttribute('aria-pressed', String(control === button)));
      images.forEach(image => { image.hidden = filter !== 'all' && image.dataset.category !== filter; });
      const visibleCount = images.filter(image => !image.hidden).length;
      grid.classList.toggle('small-collection', visibleCount < 3);
      grid.classList.toggle('single-visible', visibleCount === 1);
      updateEmpty(visibleCount);
      const announcement = document.getElementById('filter-announcement');
      if (announcement) announcement.textContent = formatText(
        visibleCount === 1 ? ui.portfolio.oneResultTemplate : ui.portfolio.manyResultsTemplate,
        {count: visibleCount}
      );
    }));
  }

  function initMenus() {
    const menus = [...document.querySelectorAll('.site-header details')];
    document.addEventListener('click', event => {
      menus.forEach(menu => { if (menu.open && !menu.contains(event.target)) menu.open = false; });
    });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      menus.forEach(menu => {
        if (!menu.open) return;
        menu.open = false;
        menu.querySelector('summary')?.focus();
      });
    });
    document.querySelector('.skip-link')?.addEventListener('click', event => {
      const main = document.getElementById('main-content');
      if (!main) return;
      event.preventDefault();
      main.setAttribute('tabindex', '-1');
      main.focus();
    });
  }

  function initReveals() {
    if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.remove('reveal-pending');
      observer.unobserve(entry.target);
    }), {threshold: 0.04});
    const blocks = document.querySelectorAll('.personal-portrait-layout,.session-directory,.home-client-note,.service-pair>div,.session-row,.about-body,.photo-grid .photograph');
    blocks.forEach(element => {
      element.classList.add('reveal-block');
      if (element.getBoundingClientRect().top > window.innerHeight) {
        element.classList.add('reveal-pending');
        observer.observe(element);
      }
    });
    reducedMotion.addEventListener?.('change', event => {
      if (!event.matches) return;
      observer.disconnect();
      blocks.forEach(element => element.classList.remove('reveal-pending'));
    });
  }

  function initInquiry() {
    const form = document.getElementById('inquiry-form');
    if (!form) return;
    const button = form.querySelector('button[type="submit"]');
    const status = document.getElementById('inquiry-status');
    if (!button || !status) return;
    let token = null;
    let tokenPromise = null;
    let tokenReceivedAt = 0;
    let sending = false;
    let submittedSnapshot = '';

    async function requestJSON(url, options = {}) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      try {
        const response = await fetch(url, {...options, credentials: 'same-origin', cache: 'no-store', signal: controller.signal});
        let result;
        try { result = await response.json(); } catch { result = {}; }
        return {response, result};
      } finally { clearTimeout(timeout); }
    }
    async function getToken(force = false) {
      if (force) token = null;
      if (token && Date.now() - tokenReceivedAt < 110 * 60 * 1000) return token;
      if (tokenPromise) return tokenPromise;
      tokenPromise = (async () => {
        const {response, result} = await requestJSON('/api/inquiry', {headers: {Accept: 'application/json'}});
        if (!response.ok || typeof result.token !== 'string' || !result.token || result.issuedAt == null) throw new Error('TOKEN_UNAVAILABLE');
        token = {token: result.token, issuedAt: result.issuedAt};
        tokenReceivedAt = Date.now();
        return token;
      })();
      try { return await tokenPromise; }
      finally { tokenPromise = null; }
    }
    function feedback(message, state, focus = false) {
      status.hidden = false;
      status.dataset.state = state;
      status.textContent = message;
      if (focus) status.focus();
    }
    function values() {
      const fields = new FormData(form);
      return Object.fromEntries(['name', 'email', 'session', 'when', 'message', 'website'].map(key => [key, String(fields.get(key) || '').trim()]));
    }
    function validateFields(payload) {
      const limits = {name: 120, email: 254, session: 100, when: 200, message: 6000};
      for (const [key, limit] of Object.entries(limits)) {
        const field = form.elements.namedItem(key);
        if (!field || typeof field.setCustomValidity !== 'function') continue;
        field.setCustomValidity(payload[key].length > limit
          ? formatText(ui.inquiry.characterLimitTemplate, {limit}) : '');
      }
      if (!payload.name) form.elements.namedItem('name').setCustomValidity(ui.inquiry.nameRequiredMessage);
      return form.reportValidity();
    }
    form.addEventListener('invalid', event => {
      const field = event.target;
      if (!field.validity || typeof field.setCustomValidity !== 'function' || field.validity.customError) return;
      if (field.validity.valueMissing) {
        field.setCustomValidity(field.name === 'name' ? ui.inquiry.nameRequiredMessage
          : field.name === 'email' ? ui.inquiry.emailRequiredMessage : ui.inquiry.requiredMessage);
      } else if (field.name === 'email' && field.validity.typeMismatch) {
        field.setCustomValidity(ui.inquiry.emailInvalidMessage);
      }
    }, true);
    form.addEventListener('reset', () => {
      [...form.elements].forEach(field => field.setCustomValidity?.(''));
    });
    form.addEventListener('input', event => {
      event.target.setCustomValidity?.('');
      if (!sending && submittedSnapshot && JSON.stringify(values()) !== submittedSnapshot) {
        button.disabled = false;
        button.textContent = ui.inquiry.submitLabel;
      }
    });
    form.addEventListener('change', event => {
      event.target.setCustomValidity?.('');
      if (!sending && submittedSnapshot && JSON.stringify(values()) !== submittedSnapshot) {
        button.disabled = false;
        button.textContent = ui.inquiry.submitLabel;
      }
    });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (sending) return;
      const payload = values();
      if (!validateFields(payload)) return;
      const snapshot = JSON.stringify(payload);
      if (snapshot === submittedSnapshot) {
        feedback(ui.inquiry.alreadySentMessage, 'sent', true);
        return;
      }
      sending = true;
      button.disabled = true;
      button.textContent = ui.inquiry.sendingButtonLabel;
      form.setAttribute('aria-busy', 'true');
      feedback(ui.inquiry.sendingMessage, 'sending');
      let accepted = false;
      try {
        const proof = await getToken();
        const minimumWait = 1100 - (Date.now() - tokenReceivedAt);
        if (minimumWait > 0) await new Promise(resolve => setTimeout(resolve, minimumWait));
        const body = JSON.stringify({...payload, ...proof});
        if (new TextEncoder().encode(body).length > 12000) {
          feedback(ui.inquiry.tooLongMessage, 'error', true);
          return;
        }
        const {response, result} = await requestJSON('/api/inquiry', {
          method: 'POST',
          headers: {'Content-Type': 'application/json', Accept: 'application/json'},
          body
        });
        if (response.ok && result.ok === true) {
          accepted = true;
          submittedSnapshot = snapshot;
          feedback(ui.inquiry.successMessage, 'sent', true);
          button.textContent = ui.inquiry.sentButtonLabel;
          token = null;
          return;
        }
        if (result.code === 'TOKEN_EXPIRED') {
          await getToken(true).catch(() => null);
          feedback(ui.inquiry.expiredMessage, 'error', true);
        } else if (response.status === 429) {
          feedback(ui.inquiry.rateLimitMessage, 'error', true);
        } else if (response.status === 400 || response.status === 422) {
          feedback(ui.inquiry.validationMessage, 'error', true);
        } else {
          feedback(ui.inquiry.failureMessage, 'error', true);
        }
      } catch {
        feedback(ui.inquiry.failureMessage, 'error', true);
      } finally {
        sending = false;
        form.removeAttribute('aria-busy');
        if (!accepted || JSON.stringify(values()) !== submittedSnapshot) {
          button.disabled = false;
          button.textContent = ui.inquiry.submitLabel;
        }
      }
    });
    getToken().catch(() => null);
  }

  initLightbox();
  initHero();
  initFilters();
  initMenus();
  initReveals();
  initInquiry();
})();
