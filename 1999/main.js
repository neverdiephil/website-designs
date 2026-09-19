'use strict';

(() => {
  const CHANNELS = [
    { id: 'home', label: 'Home', angle: 0 },
    { id: 'posts', label: 'Posts', angle: 90 },
    { id: 'about', label: 'About Me', angle: 180 },
    { id: 'contact', label: 'Contact Us', angle: 270 }
  ];

  const desktopScreen = document.querySelector('.tv-screen');
  const mobileScreen = document.querySelector('.gameboy-screen');
  const tamagotchiScreen = document.querySelector('.tamagotchi-screen');
  const knob = document.querySelector('[data-channel-knob]');
  const knobFace = document.querySelector('.channel-knob-face');
  const labels = [...document.querySelectorAll('[data-channel]')];
  const mobileControls = [...document.querySelectorAll('[data-gameboy-action]')];
  const tamagotchiControls = [...document.querySelectorAll('[data-tama-action]')];
  const tamagotchiIcons = [...document.querySelectorAll('[data-tama-channel]')];

  if (!desktopScreen || !knob || !knobFace) {
    return;
  }

  /*
   * The desktop TV contains the canonical copy of the page markup.
   * Clone it into the Game Boy screen once so both layouts always show the
   * same content without maintaining two hand-written copies in index.html.
   */
  const desktopContent = desktopScreen.querySelector('.screen-content');

  if (mobileScreen && desktopContent && !mobileScreen.querySelector('.screen-content')) {
    mobileScreen.append(desktopContent.cloneNode(true));
  }

  if (tamagotchiScreen && desktopContent && !tamagotchiScreen.querySelector('.screen-content')) {
    tamagotchiScreen.append(desktopContent.cloneNode(true));
  }

  const screens = [desktopScreen, mobileScreen, tamagotchiScreen].filter(Boolean);
  const pages = [...document.querySelectorAll('[data-page]')];

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileLayout = window.matchMedia('(max-width: 760px)');
  const landscapeLayout = window.matchMedia(
    '(orientation: landscape) and (max-height: 600px) and (max-width: 1200px)'
  );

  let currentIndex = 0;
  let currentAngle = 0;
  let changeTimer = 0;

  function channelIndexFromHash() {
    const id = window.location.hash.slice(1).toLowerCase();
    const index = CHANNELS.findIndex((channel) => channel.id === id);
    return index >= 0 ? index : 0;
  }

  function nearestEquivalentAngle(targetAngle) {
    const turns = Math.round((currentAngle - targetAngle) / 360);
    const candidates = [
      targetAngle + (turns - 1) * 360,
      targetAngle + turns * 360,
      targetAngle + (turns + 1) * 360
    ];

    return candidates.reduce((nearest, candidate) => (
      Math.abs(candidate - currentAngle) < Math.abs(nearest - currentAngle)
        ? candidate
        : nearest
    ));
  }

  function updateKnob(index, direction = 'nearest') {
    const baseAngle = CHANNELS[index].angle;

    if (direction === 'next') {
      currentAngle += 90;
    } else if (direction === 'previous') {
      currentAngle -= 90;
    } else {
      currentAngle = nearestEquivalentAngle(baseAngle);
    }

    knobFace.style.setProperty('--knob-angle', `${currentAngle}deg`);
  }

  function commitPage(index) {
    const channel = CHANNELS[index];

    pages.forEach((page) => {
      const active = page.dataset.page === channel.id;
      page.hidden = !active;
      page.classList.toggle('is-active', active);
    });

    labels.forEach((label) => {
      const active = label.dataset.channel === channel.id;
      label.classList.toggle('is-active', active);

      if (active) {
        label.setAttribute('aria-current', 'page');
      } else {
        label.removeAttribute('aria-current');
      }
    });

    tamagotchiIcons.forEach((icon) => {
      const active = icon.dataset.tamaChannel === channel.id;
      icon.classList.toggle('is-active', active);

      if (active) {
        icon.setAttribute('aria-current', 'page');
      } else {
        icon.removeAttribute('aria-current');
      }
    });

    knob.setAttribute(
      'aria-label',
      `Channel selector. ${channel.label} selected. Click to turn to the next channel.`
    );

    screens.forEach((screen) => {
      screen.scrollTop = 0;
    });

    currentIndex = index;
  }

  function setHash(channelId, mode = 'push') {
    const url = new URL(window.location.href);
    url.hash = channelId;

    if (mode === 'replace') {
      window.history.replaceState(null, '', url);
    } else {
      window.history.pushState(null, '', url);
    }
  }

  function selectChannel(index, options = {}) {
    const {
      direction = 'nearest',
      animate = true,
      historyMode = 'push'
    } = options;

    const normalizedIndex = (index + CHANNELS.length) % CHANNELS.length;
    const channel = CHANNELS[normalizedIndex];

    window.clearTimeout(changeTimer);
    updateKnob(normalizedIndex, direction);

    if (historyMode) {
      setHash(channel.id, historyMode);
    }

    const activeScreen = landscapeLayout.matches && tamagotchiScreen
      ? tamagotchiScreen
      : mobileLayout.matches && mobileScreen
        ? mobileScreen
        : desktopScreen;

    screens.forEach((screen) => {
      screen.classList.remove('channel-changing', 'lcd-changing', 'tama-changing');
    });

    if (!animate || reduceMotion.matches) {
      commitPage(normalizedIndex);
      return;
    }

    if (activeScreen === tamagotchiScreen) {
      activeScreen.classList.add('tama-changing');
    } else if (activeScreen === mobileScreen) {
      activeScreen.classList.add('lcd-changing');
    } else {
      activeScreen.classList.add('channel-changing');
    }

    const commitDelay = activeScreen === tamagotchiScreen
      ? 70
      : activeScreen === mobileScreen
        ? 75
        : 135;

    changeTimer = window.setTimeout(() => {
      commitPage(normalizedIndex);

      window.setTimeout(() => {
        activeScreen.classList.remove(
          'channel-changing',
          'lcd-changing',
          'tama-changing'
        );
      }, activeScreen === desktopScreen ? 130 : 55);
    }, commitDelay);
  }

  function scrollMobileScreen(direction) {
    if (!mobileScreen) {
      return;
    }

    const amount = Math.max(34, mobileScreen.clientHeight * 0.34);
    mobileScreen.scrollBy({
      top: direction * amount,
      behavior: reduceMotion.matches ? 'auto' : 'smooth'
    });
  }

  knob.addEventListener('click', () => {
    selectChannel(currentIndex + 1, { direction: 'next' });
  });

  knob.addEventListener('keydown', (event) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        selectChannel(currentIndex + 1, { direction: 'next' });
        break;

      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        selectChannel(currentIndex - 1, { direction: 'previous' });
        break;

      case 'Home':
        event.preventDefault();
        selectChannel(0);
        break;

      case 'End':
        event.preventDefault();
        selectChannel(CHANNELS.length - 1);
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        selectChannel(currentIndex + 1, { direction: 'next' });
        break;

      default:
        break;
    }
  });

  labels.forEach((label) => {
    label.addEventListener('click', () => {
      const index = CHANNELS.findIndex(
        (channel) => channel.id === label.dataset.channel
      );

      if (index >= 0 && index !== currentIndex) {
        selectChannel(index);
      }
    });
  });

  mobileControls.forEach((control) => {
    control.addEventListener('click', () => {
      switch (control.dataset.gameboyAction) {
        case 'next':
          selectChannel(currentIndex + 1, { direction: 'next' });
          break;

        case 'previous':
          selectChannel(currentIndex - 1, { direction: 'previous' });
          break;

        case 'scroll-up':
          scrollMobileScreen(-1);
          break;

        case 'scroll-down':
          scrollMobileScreen(1);
          break;

        case 'home':
          selectChannel(0);
          break;

        default:
          break;
      }
    });
  });


  tamagotchiIcons.forEach((icon) => {
    icon.addEventListener('click', () => {
      const index = CHANNELS.findIndex(
        (channel) => channel.id === icon.dataset.tamaChannel
      );

      if (index >= 0 && index !== currentIndex) {
        selectChannel(index);
      }
    });
  });

  tamagotchiControls.forEach((control) => {
    control.addEventListener('click', () => {
      switch (control.dataset.tamaAction) {
        case 'next':
          selectChannel(currentIndex + 1, { direction: 'next' });
          break;

        case 'previous':
          selectChannel(currentIndex - 1, { direction: 'previous' });
          break;

        case 'home':
          selectChannel(0);
          break;

        default:
          break;
      }
    });
  });

  window.addEventListener('popstate', () => {
    selectChannel(channelIndexFromHash(), {
      animate: true,
      historyMode: null
    });
  });

  // ------------------------------------------------------------------------
  // Desktop VHS tracking sweep
  // ------------------------------------------------------------------------
  const trackingLine = document.querySelector('.vhs-tracking-line');
  let trackingTimer = 0;

  function scheduleTrackingSweep() {
    /*
     * VHS belongs to the desktop television only. Stop the timer entirely
     * while the responsive Game Boy layout is active.
     */
    if (
      !trackingLine ||
      reduceMotion.matches ||
      mobileLayout.matches ||
      landscapeLayout.matches
    ) {
      return;
    }

    const delay = 5000 + Math.random() * 9000;

    trackingTimer = window.setTimeout(() => {
      trackingLine.classList.remove('is-active');
      desktopScreen.classList.remove('vhs-distorting');

      void trackingLine.offsetWidth;

      trackingLine.classList.add('is-active');
      desktopScreen.classList.add('vhs-distorting');

      window.setTimeout(() => {
        trackingLine.classList.remove('is-active');
        desktopScreen.classList.remove('vhs-distorting');
      }, 1700);

      scheduleTrackingSweep();
    }, delay);
  }

  function resetTrackingSweep() {
    window.clearTimeout(trackingTimer);
    trackingLine?.classList.remove('is-active');
    desktopScreen.classList.remove('vhs-distorting');

    if (
      !reduceMotion.matches &&
      !mobileLayout.matches &&
      !landscapeLayout.matches
    ) {
      scheduleTrackingSweep();
    }
  }

  // Initial state honors a directly linked URL such as index.html#about.
  const initialIndex = channelIndexFromHash();
  currentIndex = initialIndex;
  currentAngle = CHANNELS[initialIndex].angle;
  knobFace.style.setProperty('--knob-angle', `${currentAngle}deg`);
  commitPage(initialIndex);
  setHash(CHANNELS[initialIndex].id, 'replace');

  resetTrackingSweep();
  reduceMotion.addEventListener?.('change', resetTrackingSweep);
  mobileLayout.addEventListener?.('change', resetTrackingSweep);
  landscapeLayout.addEventListener?.('change', resetTrackingSweep);
})();