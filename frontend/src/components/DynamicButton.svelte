
<script>
  import { highlightColors } from '../content/color.ts';

  export let disabled = false;

  let color = highlightColors[Math.floor(Math.random() * highlightColors.length)];

  function changeColor() {
    color = highlightColors[Math.floor(Math.random() * highlightColors.length)];
  }
</script>

<button
  class="btn-portfolio"
  style={`--chosen-color: ${color.hex}`}
  on:mouseenter={changeColor}
  on:touchstart={changeColor}
  disabled={disabled}
  on:click
>
  <slot />
</button>
