<script>
  import { onMount } from 'svelte';
  import { register } from 'swiper/element/bundle';
  export let projects = [];

  onMount(() => {
    register();
  });
</script>

<div class="slider-boundary">
  <swiper-container
    init="true"
    slides-per-view="1.1"
    space-between="20"
    centered-slides="false"
    navigation={JSON.stringify({
      prevEl: '.prev-btn',
      nextEl: '.next-btn'
    })}
    pagination={JSON.stringify({
      clickable: true,
      el: '.custom-dots'
    })}
    breakpoints={JSON.stringify({
      768: { slidesPerView: 2 },
      1024: { slidesPerView: 2.2 }
    })}
  >
    {#each projects as project}
      <swiper-slide>
        <a href={`/projects/${project.slug}`} class="custom-card-reset">
          <div class="image-box">
            <img src={project.data.image} alt="" />
          </div>
          <div class="text-box">
            <div class="title-area">
               <h3>{project.data.title}</h3>
            </div>
            <p>{project.data.description}</p>
          </div>
        </a>
      </swiper-slide>
    {/each}
  </swiper-container>

  <div class="slider-controls">
    <button class="nav-btn prev-btn" aria-label="Previous slide">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
    </button>
    
    <div class="custom-dots"></div>

    <button class="nav-btn next-btn" aria-label="Next slide">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
    </button>
  </div>
</div>

<style>
  .slider-boundary {
    width: 100vw;
    margin-left: calc(50% - 50vw);
    position: relative;
    /* Added space below for the View All button in Astro */
    padding-bottom: 0rem; 
  }

  swiper-container {
    width: 100%;
    padding: 0 calc((100vw - 720px) / 2);
    margin-top: 1rem;
  }

  /* INTEGRATED CONTROLS STYLING */
  .slider-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 24px;
    margin-top: 1rem;
  }

  .custom-dots {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .nav-btn {
    background: transparent;
    border: none;
    color: #666;
    width: 32px;
    height: 32px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s ease;
    padding: 0;
  }

  .nav-btn:hover {
    color: var(--text);
  }

  .nav-btn svg {
    width: 24px;
    height: 24px;
  }

  /* DOT STYLING */
  :global(.swiper-pagination-bullet) {
    width: 6px;
    height: 6px;
    background: #444 !important;
    opacity: 1 !important;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  :global(.swiper-pagination-bullet-active) {
    background: var(--muted) !important;
    width: 18px;
    border-radius: 3px;
  }

  /* CARD STYLING (Kept from previous) */
  .custom-card-reset {
    display: flex;
    flex-direction: column;
    width: 100%;
    background: #111113; 
    border: 1px solid var(--border);
    border-radius: 12px;
    text-decoration: none !important;
    overflow: hidden;
  }

  .image-box {
    width: 100%;
    aspect-ratio: 16 / 9;
    overflow: hidden;
  }

  .image-box img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .text-box { padding: 1.5rem; }
  .title-area { height: 3rem; margin-bottom: 0.5rem; }

  h3 {
    margin: 0 !important;
    font-size: 1.2rem !important;
    color: var(--text);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  p {
    margin: 0 !important;
    font-size: 0.9rem;
    color: var(--muted);
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  @media (max-width: 768px) {
    swiper-container { padding: 0 1rem; }
    /* Hide arrows on mobile but keep dots */
    .nav-btn { display: none; }
  }
</style>