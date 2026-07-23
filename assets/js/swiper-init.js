(function () {
  "use strict";

  // Remove swiper-slides whose images 404, then run callback with remaining count.
  // Note: relies on HTTP — does not work on file:// origins.
  function pruneMissingSlides(el, callback) {
    const slides = Array.from(el.querySelectorAll(".swiper-slide"));
    let pending = slides.length;
    if (!pending) {
      callback(0);
      return;
    }

    slides.forEach(function (slide) {
      const img = slide.querySelector("img");
      if (!img) {
        if (--pending === 0)
          callback(el.querySelectorAll(".swiper-slide").length);
        return;
      }
      const test = new Image();
      test.onload = function () {
        if (--pending === 0)
          callback(el.querySelectorAll(".swiper-slide").length);
      };
      test.onerror = function () {
        slide.remove();
        if (--pending === 0)
          callback(el.querySelectorAll(".swiper-slide").length);
      };
      test.src = img.src;
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    // Project detail pages — full nav with arrows, dots, and keyboard.
    // Prunes missing placeholder slides before init so no blank slides appear.
    document.querySelectorAll(".project-swiper").forEach(function (el) {
      pruneMissingSlides(el, function (count) {
        if (count === 0) return;
        new Swiper(el, {
          loop: false,
          navigation: {
            nextEl: el.querySelector(".swiper-button-next"),
            prevEl: el.querySelector(".swiper-button-prev"),
          },
          pagination: {
            el: el.querySelector(".swiper-pagination"),
            clickable: true,
          },
          keyboard: { enabled: true },
        });
      });
    });

    // Index page project cards — autoplay only, no nav buttons.
    // Nested inside <a> links: preventClicks/preventClicksPropagation: false
    // ensures card link clicks work normally.
    // Cards with 1 image skip init entirely (avoids loop artifacts).
    document.querySelectorAll(".card-swiper").forEach(function (el) {
      const slides = el.querySelectorAll(".swiper-slide");
      if (slides.length <= 1) return;
      new Swiper(el, {
        loop: true,
        autoplay: { delay: 2500, disableOnInteraction: false },
        allowTouchMove: true,
        preventClicks: false,
        preventClicksPropagation: false,
      });
    });
  });
})();
