// Single source of truth for how many cards-per-view the home page's
// Project/Blog swiper carousels show at each viewport width. Both the
// <swiper-container breakpoints> attribute and the JS correction below
// read from this object so they can never drift out of sync with each
// other again.
export const CARD_BREAKPOINTS = {
  base: 1.1,
  768: 2,
  1024: 2.2,
};

export function breakpointsAttr(breakpoints = CARD_BREAKPOINTS) {
  const entries = Object.entries(breakpoints).filter(([key]) => key !== 'base');
  return JSON.stringify(
    Object.fromEntries(entries.map(([width, slidesPerView]) => [width, { slidesPerView }]))
  );
}

function resolveSlidesPerView(breakpoints, width) {
  const sorted = Object.entries(breakpoints)
    .filter(([key]) => key !== 'base')
    .map(([key, value]) => [Number(key), value])
    .sort((a, b) => b[0] - a[0]);

  for (const [minWidth, slidesPerView] of sorted) {
    if (width >= minWidth) return slidesPerView;
  }
  return breakpoints.base;
}

/**
 * Swiper Element can race when two independent <swiper-container> instances
 * exist on the same page: both correctly detect which breakpoint they're
 * in, but one silently fails to apply that breakpoint's slidesPerView (a
 * bug in Swiper's own multi-instance breakpoint resolution, confirmed by
 * inspecting swiper.params directly across repeated loads — not a CSS or
 * timing issue we can wait out). This bypasses that resolution path
 * entirely: it reads the viewport width itself and sets slidesPerView
 * directly, once the Swiper instance exists (covering both "already
 * initialized by the time this runs" and "initializes moments later" via
 * Swiper Element's own forwarded `init` DOM event) and again on resize.
 *
 * Call from onMount with a bound reference to the <swiper-container>
 * element; returns a cleanup function.
 */
export function syncSlidesPerView(containerEl, breakpoints = CARD_BREAKPOINTS) {
  const apply = () => {
    const swiper = containerEl?.swiper;
    if (!swiper) return;
    const correct = resolveSlidesPerView(breakpoints, window.innerWidth);
    if (swiper.params.slidesPerView !== correct) {
      swiper.params.slidesPerView = correct;
      swiper.update();
    }
  };

  containerEl.addEventListener('init', apply);
  window.addEventListener('resize', apply);
  apply(); // covers the case where Swiper already finished initializing synchronously

  return () => {
    containerEl.removeEventListener('init', apply);
    window.removeEventListener('resize', apply);
  };
}
