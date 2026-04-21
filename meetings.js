(function () {
  const weeks = Array.isArray(window.clubWeeks) ? window.clubWeeks : [];
  const meetings = Array.isArray(window.clubMeetings) ? window.clubMeetings : [];
  const initializedGalleries = new WeakSet();
  let modalState = null;

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function truncateText(text, maxLength = 180) {
    if (!text || text.length <= maxLength) {
      return text || "";
    }

    return `${text.slice(0, maxLength).trimEnd()}...`;
  }

  function getMeetingPhotos(meeting) {
    const photos = Array.isArray(meeting?.photos) ? meeting.photos : [];
    const validPhotos = photos.filter((photo) => typeof photo === "string" && photo.trim());

    if (validPhotos.length) {
      return validPhotos;
    }

    return meeting?.image ? [meeting.image] : [];
  }

  function getMeetingVideos(meeting) {
    const videos = Array.isArray(meeting?.videos) ? meeting.videos : [];
    return videos.filter((video) => typeof video === "string" && video.trim());
  }

  function revealElements(elements) {
    const targets = [...elements].filter(Boolean);
    if (!targets.length) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      targets.forEach((target) => target.classList.add("visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.16 }
    );

    targets.forEach((target, index) => {
      target.classList.add("reveal");
      target.style.transitionDelay = `${Math.min(index * 70, 280)}ms`;
      observer.observe(target);
    });
  }

  function getMeetingById(meetingId) {
    return meetings.find((meeting) => meeting.id === meetingId);
  }

  function createMeetingGallery(meeting, variant = "card") {
    const photos = getMeetingPhotos(meeting);
    const hasPhotos = photos.length > 0;
    const hasMultiplePhotos = photos.length > 1;
    const galleryTitle = escapeHtml(meeting.title || "Фото встречи");
    const fitClass = meeting.imageFit === "contain" ? " meeting-gallery-contain" : "";
    const galleryClass = `meeting-gallery meeting-gallery-${variant}${fitClass}`;

    if (!hasPhotos) {
      return `
        <div class="${galleryClass} meeting-gallery-empty" aria-label="Фото встречи пока не добавлено">
          <span>Фото пока не добавлено</span>
        </div>
      `;
    }

    const slides = photos
      .map(
        (photo, index) => `
          <div class="meeting-gallery-slide">
            <button class="meeting-gallery-open" type="button" data-gallery-open data-gallery-index="${index}" aria-label="Открыть фото крупнее">
              <img class="meeting-gallery-image" src="${escapeHtml(photo)}" alt="${galleryTitle}, фото ${index + 1}" loading="${index === 0 ? "eager" : "lazy"}" />
            </button>
          </div>
        `
      )
      .join("");

    const controls = hasMultiplePhotos
      ? `
        <button class="meeting-gallery-arrow meeting-gallery-arrow-prev" type="button" data-gallery-prev aria-label="Предыдущее фото" title="Предыдущее фото">&#10094;</button>
        <button class="meeting-gallery-arrow meeting-gallery-arrow-next" type="button" data-gallery-next aria-label="Следующее фото" title="Следующее фото">&#10095;</button>
        <div class="meeting-gallery-dots" aria-label="Индикаторы фото">
          ${photos
            .map(
              (_, index) => `
                <button class="meeting-gallery-dot${index === 0 ? " is-active" : ""}" type="button" data-gallery-dot="${index}" aria-label="Показать фото ${index + 1}"></button>
              `
            )
            .join("")}
        </div>
      `
      : "";

    return `
      <div class="${galleryClass}" data-meeting-gallery data-gallery-index="0" data-gallery-photos="${escapeHtml(JSON.stringify(photos))}" data-gallery-title="${galleryTitle}" tabindex="${hasMultiplePhotos ? "0" : "-1"}" aria-label="${hasMultiplePhotos ? "Галерея фото встречи" : "Фото встречи"}">
        <div class="meeting-gallery-track" data-gallery-track>
          ${slides}
        </div>
        ${controls}
      </div>
    `;
  }

  function createMeetingCover(meeting) {
    const photo = getMeetingPhotos(meeting)[0];
    const title = escapeHtml(meeting.title || "Фото встречи");
    const href = `meeting.html?meeting=${encodeURIComponent(meeting.id)}`;
    const fitClass = meeting.imageFit === "contain" ? " meeting-card-media-contain" : "";

    if (!photo) {
      return `
        <a class="meeting-card-media meeting-gallery-empty" href="${href}" aria-label="Открыть встречу ${title}">
          <span>Фото пока не добавлено</span>
        </a>
      `;
    }

    return `
      <a class="meeting-card-media${fitClass}" href="${href}" aria-label="Открыть встречу ${title}">
        <img class="meeting-card-image" src="${escapeHtml(photo)}" alt="${title}" loading="lazy" />
      </a>
    `;
  }

  function getVideoType(videoPath) {
    const extension = String(videoPath).split(".").pop()?.toLowerCase();
    const types = {
      mp4: "video/mp4",
      webm: "video/webm",
      ogg: "video/ogg",
      mov: "video/quicktime"
    };

    return types[extension] || "";
  }

  function createMeetingVideos(meeting) {
    const videos = getMeetingVideos(meeting);

    if (!videos.length) {
      return "";
    }

    const videoButtons = videos
      .map(
        (video, index) => `
          <button class="meeting-video-tab${index === 0 ? " is-active" : ""}" type="button" data-video-src="${escapeHtml(video)}" data-video-index="${index}" aria-label="Открыть видео ${index + 1}">
            Видео ${index + 1}
          </button>
        `
      )
      .join("");

    return `
      <section class="meeting-video-section" data-meeting-videos>
        <div class="meeting-video-head">
          <p class="meeting-detail-week">Видео встречи</p>
          <p>${videos.length === 1 ? "Доступна видеозапись этой встречи." : `Доступно видео: ${videos.length}`}</p>
        </div>
        <div class="meeting-video-player-wrap">
          <video class="meeting-video-player" controls preload="metadata" data-video-player>
            <source src="${escapeHtml(videos[0])}" type="${escapeHtml(getVideoType(videos[0]))}" data-video-source />
            Ваш браузер не поддерживает просмотр видео.
          </video>
        </div>
        ${videos.length > 1 ? `<div class="meeting-video-tabs" aria-label="Выбор видео">${videoButtons}</div>` : ""}
      </section>
    `;
  }

  function setupMeetingVideos(root = document) {
    root.querySelectorAll("[data-meeting-videos]").forEach((section) => {
      const player = section.querySelector("[data-video-player]");
      const source = section.querySelector("[data-video-source]");

      if (!player || !source) {
        return;
      }

      section.addEventListener("click", (event) => {
        const tab = event.target.closest("[data-video-src]");
        if (!tab) {
          return;
        }

        section.querySelectorAll("[data-video-src]").forEach((button) => {
          const isActive = button === tab;
          button.classList.toggle("is-active", isActive);
          button.setAttribute("aria-current", isActive ? "true" : "false");
        });

        source.src = tab.dataset.videoSrc;
        source.type = getVideoType(tab.dataset.videoSrc);
        player.load();
        player.focus();
      });
    });
  }

  function createMeetingsBanner() {
    const root = document.querySelector("[data-meetings-entry]");
    if (!root || !meetings.length) {
      return;
    }

    const slides = meetings
      .slice(0, 4)
      .map((meeting) => getMeetingPhotos(meeting)[0])
      .filter(Boolean)
      .map(
        (photo, index) => `
          <div class="meetings-hero-slide${index === 0 ? " is-active" : ""}" data-meetings-slide>
            <img src="${escapeHtml(photo)}" alt="Фото встречи клуба" class="meetings-hero-image" />
          </div>
        `
      )
      .join("");

    root.innerHTML = `
      <a class="card meetings-hero-link" href="week.html" aria-label="Открыть страницу Наши встречи">
        <div class="meetings-hero-media" data-meetings-slider>
          ${slides}
          <div class="meetings-hero-overlay"></div>
        </div>
        <div class="meetings-hero-content">
          <span class="tag">Наши встречи</span>
          <h3>Наши встречи</h3>
          <p class="meetings-hero-text">Все встречи клуба собраны в одном живом каталоге с фото, темами и подробным описанием.</p>
          <span class="meetings-hero-action">Перейти к встречам</span>
        </div>
      </a>
    `;

    const slideNodes = root.querySelectorAll("[data-meetings-slide]");
    let activeIndex = 0;

    if (slideNodes.length > 1) {
      window.setInterval(() => {
        slideNodes[activeIndex]?.classList.remove("is-active");
        activeIndex = (activeIndex + 1) % slideNodes.length;
        slideNodes[activeIndex]?.classList.add("is-active");
      }, 3200);
    }

    revealElements(root.querySelectorAll(".meetings-hero-link"));
  }

  function createMeetingCard(meeting) {
    const article = document.createElement("article");
    article.className = "card meeting-card";
    article.innerHTML = `
      ${createMeetingCover(meeting)}
      <a class="meeting-card-link meeting-card-body" href="meeting.html?meeting=${encodeURIComponent(meeting.id)}" aria-label="Открыть встречу ${escapeHtml(meeting.title)}">
        <p class="meeting-date">${escapeHtml(meeting.date)}</p>
        <h3 class="meeting-title">${escapeHtml(meeting.title)}</h3>
        <p class="meeting-topic"><strong>Тема:</strong> ${escapeHtml(meeting.topic)}</p>
        <p class="meeting-description">${escapeHtml(truncateText(meeting.description))}</p>
      </a>
    `;
    return article;
  }

  function updateGallery(gallery, nextIndex) {
    const track = gallery.querySelector("[data-gallery-track]");
    const dots = gallery.querySelectorAll("[data-gallery-dot]");
    const photos = getGalleryPhotos(gallery);

    if (!track || !photos.length) {
      return;
    }

    const photoCount = photos.length;
    const normalizedIndex = ((nextIndex % photoCount) + photoCount) % photoCount;
    gallery.dataset.galleryIndex = String(normalizedIndex);
    track.style.transform = `translateX(-${normalizedIndex * 100}%)`;

    dots.forEach((dot, index) => {
      dot.classList.toggle("is-active", index === normalizedIndex);
      dot.setAttribute("aria-current", index === normalizedIndex ? "true" : "false");
    });
  }

  function getGalleryPhotos(gallery) {
    try {
      const photos = JSON.parse(gallery.dataset.galleryPhotos || "[]");
      return Array.isArray(photos) ? photos : [];
    } catch (error) {
      return [];
    }
  }

  function setupMeetingGalleries(root = document) {
    root.querySelectorAll("[data-meeting-gallery]").forEach((gallery) => {
      if (initializedGalleries.has(gallery)) {
        return;
      }

      initializedGalleries.add(gallery);
      const photos = getGalleryPhotos(gallery);
      let pointerStartX = null;
      let pointerStartY = null;

      gallery.addEventListener("click", (event) => {
        const currentIndex = Number(gallery.dataset.galleryIndex || 0);

        if (event.target.closest("[data-gallery-prev]")) {
          event.preventDefault();
          updateGallery(gallery, currentIndex - 1);
          return;
        }

        if (event.target.closest("[data-gallery-next]")) {
          event.preventDefault();
          updateGallery(gallery, currentIndex + 1);
          return;
        }

        const dot = event.target.closest("[data-gallery-dot]");
        if (dot) {
          event.preventDefault();
          updateGallery(gallery, Number(dot.dataset.galleryDot || 0));
          return;
        }

        const opener = event.target.closest("[data-gallery-open]");
        if (opener) {
          event.preventDefault();
          openPhotoModal(photos, Number(gallery.dataset.galleryIndex || opener.dataset.galleryIndex || 0), gallery.dataset.galleryTitle);
        }
      });

      gallery.addEventListener("keydown", (event) => {
        if (!photos.length) {
          return;
        }

        const currentIndex = Number(gallery.dataset.galleryIndex || 0);

        if (event.key === "ArrowLeft") {
          event.preventDefault();
          updateGallery(gallery, currentIndex - 1);
        }

        if (event.key === "ArrowRight") {
          event.preventDefault();
          updateGallery(gallery, currentIndex + 1);
        }
      });

      gallery.addEventListener("pointerdown", (event) => {
        pointerStartX = event.clientX;
        pointerStartY = event.clientY;
      });

      gallery.addEventListener("pointerup", (event) => {
        if (pointerStartX === null || pointerStartY === null || photos.length < 2) {
          pointerStartX = null;
          pointerStartY = null;
          return;
        }

        const deltaX = event.clientX - pointerStartX;
        const deltaY = event.clientY - pointerStartY;
        pointerStartX = null;
        pointerStartY = null;

        if (Math.abs(deltaX) < 42 || Math.abs(deltaX) < Math.abs(deltaY)) {
          return;
        }

        updateGallery(gallery, Number(gallery.dataset.galleryIndex || 0) + (deltaX < 0 ? 1 : -1));
      });
    });
  }

  function ensurePhotoModal() {
    let modal = document.querySelector("[data-photo-modal]");
    if (modal) {
      return modal;
    }

    modal = document.createElement("div");
    modal.className = "photo-modal";
    modal.hidden = true;
    modal.dataset.photoModal = "";
    modal.innerHTML = `
      <button class="photo-modal-backdrop" type="button" data-photo-close aria-label="Закрыть просмотр"></button>
      <div class="photo-modal-dialog" role="dialog" aria-modal="true" aria-label="Просмотр фотографии">
        <button class="photo-modal-close" type="button" data-photo-close aria-label="Закрыть">Закрыть</button>
        <button class="photo-modal-arrow photo-modal-prev" type="button" data-photo-prev aria-label="Предыдущее фото">&#10094;</button>
        <img class="photo-modal-image" src="" alt="" />
        <button class="photo-modal-arrow photo-modal-next" type="button" data-photo-next aria-label="Следующее фото">&#10095;</button>
        <p class="photo-modal-counter" data-photo-counter></p>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (event) => {
      if (event.target.closest("[data-photo-close]")) {
        closePhotoModal();
        return;
      }

      if (event.target.closest("[data-photo-prev]")) {
        showModalPhoto((modalState?.index || 0) - 1);
        return;
      }

      if (event.target.closest("[data-photo-next]")) {
        showModalPhoto((modalState?.index || 0) + 1);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (!modalState) {
        return;
      }

      if (event.key === "Escape") {
        closePhotoModal();
      }

      if (event.key === "ArrowLeft") {
        showModalPhoto(modalState.index - 1);
      }

      if (event.key === "ArrowRight") {
        showModalPhoto(modalState.index + 1);
      }
    });

    return modal;
  }

  function openPhotoModal(photos, index = 0, title = "Фото встречи") {
    if (!Array.isArray(photos) || !photos.length) {
      return;
    }

    const modal = ensurePhotoModal();
    modalState = {
      photos,
      index,
      title: title || "Фото встречи"
    };
    modal.hidden = false;
    document.body.classList.add("modal-open");
    showModalPhoto(index);
    modal.querySelector("[data-photo-close]")?.focus();
  }

  function closePhotoModal() {
    const modal = document.querySelector("[data-photo-modal]");
    if (!modal) {
      return;
    }

    modal.hidden = true;
    modalState = null;
    document.body.classList.remove("modal-open");
  }

  function showModalPhoto(nextIndex) {
    if (!modalState?.photos.length) {
      return;
    }

    const modal = ensurePhotoModal();
    const photoCount = modalState.photos.length;
    const index = ((nextIndex % photoCount) + photoCount) % photoCount;
    const image = modal.querySelector(".photo-modal-image");
    const counter = modal.querySelector("[data-photo-counter]");
    const arrows = modal.querySelectorAll(".photo-modal-arrow");

    modalState.index = index;

    if (image) {
      image.src = modalState.photos[index];
      image.alt = `${modalState.title}, фото ${index + 1}`;
    }

    if (counter) {
      counter.textContent = `${index + 1} из ${photoCount}`;
    }

    arrows.forEach((arrow) => {
      arrow.hidden = photoCount < 2;
    });
  }

  function renderMeetingsPage() {
    const root = document.querySelector("[data-meetings-page]");
    if (!root) {
      return;
    }

    const titleNode = document.querySelector("[data-meetings-title]");
    const subtitleNode = document.querySelector("[data-meetings-subtitle]");
    const infoNode = document.querySelector("[data-meetings-info]");

    if (!meetings.length) {
      if (titleNode) {
        titleNode.textContent = "Наши встречи";
      }
      if (subtitleNode) {
        subtitleNode.textContent = "Список встреч пока пуст.";
      }
      if (infoNode) {
        infoNode.textContent = "";
      }
      root.innerHTML = '<article class="card page-empty-state reveal visible"><p>Встречи пока не добавлены.</p></article>';
      return;
    }

    document.title = "Наши встречи | Progressive Students Club";

    if (titleNode) {
      titleNode.textContent = "Наши встречи";
    }
    if (subtitleNode) {
      subtitleNode.textContent = "Все встречи клуба собраны в едином современном каталоге.";
    }
    if (infoNode) {
      infoNode.textContent = `${meetings.length} встреч`;
    }

    root.innerHTML = "";
    meetings.forEach((meeting) => {
      root.appendChild(createMeetingCard(meeting));
    });

    revealElements(root.querySelectorAll(".meeting-card"));
  }

  function renderMeetingPage() {
    const root = document.querySelector("[data-meeting-page]");
    if (!root) {
      return;
    }

    const backLink = document.querySelector("[data-meeting-back]");
    if (backLink) {
      backLink.href = "week.html";
    }
    const params = new URLSearchParams(window.location.search);
    const meeting = getMeetingById(params.get("meeting"));

    if (!meeting) {
      root.innerHTML = '<article class="card page-empty-state reveal visible"><p>Встреча не найдена. Вернитесь назад и выберите другую карточку.</p></article>';
      return;
    }

    document.title = `${meeting.title} | Progressive Students Club`;
    const isMarchSeventhMeeting = meeting.id === "meeting-5";

    root.innerHTML = `
      <article class="card meeting-detail-card${isMarchSeventhMeeting ? " meeting-detail-card-reverse" : ""} reveal visible">
        <div class="meeting-detail-media">
          ${createMeetingGallery(meeting, "detail")}
        </div>
        <div class="meeting-detail-body">
          <p class="meeting-detail-week">Наши встречи</p>
          <p class="meeting-date">${escapeHtml(meeting.date)}</p>
          <h1 class="meeting-detail-title">${escapeHtml(meeting.title)}</h1>
          <p class="meeting-detail-topic"><strong>Тема:</strong> ${escapeHtml(meeting.topic)}</p>
          <p class="meeting-detail-description">${escapeHtml(meeting.fullDescription)}</p>
          ${createMeetingVideos(meeting)}
        </div>
      </article>
    `;

    setupMeetingGalleries(root);
    setupMeetingVideos(root);
  }

  document.addEventListener("DOMContentLoaded", () => {
    createMeetingsBanner();
    renderMeetingsPage();
    renderMeetingPage();
  });
})();
