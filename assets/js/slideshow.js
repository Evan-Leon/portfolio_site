(function () {
  'use strict';

  function initSlideshow(el) {
    const track = el.querySelector('.slideshow__track');
    const slides = el.querySelectorAll('.slideshow__slide');
    const dots = el.querySelectorAll('.slideshow__dot');
    const prevBtn = el.querySelector('.slideshow__arrow--prev');
    const nextBtn = el.querySelector('.slideshow__arrow--next');
    const total = slides.length;

    if (total <= 1) {
      el.classList.add('slideshow--single');
      return;
    }

    let current = 0;

    function goTo(index) {
      current = index;
      track.style.transform = `translateX(-${current * 100}%)`;
      dots.forEach((dot, i) =>
        dot.classList.toggle('slideshow__dot--active', i === current)
      );
      prevBtn.classList.toggle('slideshow__arrow--disabled', current === 0);
      nextBtn.classList.toggle('slideshow__arrow--disabled', current === total - 1);
    }

    prevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (current > 0) goTo(current - 1);
    });

    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (current < total - 1) goTo(current + 1);
    });

    dots.forEach((dot, i) => {
      dot.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        goTo(i);
      });
    });

    goTo(0);
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.slideshow').forEach(initSlideshow);
  });
})();
