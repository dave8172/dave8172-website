/* The ball. three.js draws the sphere; the answer window is HTML on top of it,
   so the text stays crisp, selectable and readable by a screen reader instead
   of being baked into a canvas texture.

   Degrades on purpose: if WebGL is missing or three.js did not load, the stage
   paints a CSS ball and everything else still works. */

window.Ball = (function () {
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ready = false;
  var renderer, scene, camera, sphere, raf;
  var spin = { x: 0, y: 0, z: 0 };
  var tumbling = false, settling = false, t0 = 0;

  function init(canvas) {
    if (typeof THREE === "undefined") return false;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    } catch (e) {
      return false;
    }
    if (!renderer) return false;

    // Cap DPR: a 3x phone screen renders 9x the pixels for no visible gain and
    // a real battery cost.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 4.4);

    var geo = new THREE.SphereGeometry(1.35, 64, 48);
    var mat = new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.34, metalness: 0.08 });
    sphere = new THREE.Mesh(geo, mat);
    scene.add(sphere);

    // Key light high-left, a dim fill so the unlit side is not a void, and a
    // tight rim to separate the ball from a warm paper background.
    var key = new THREE.DirectionalLight(0xffffff, 2.5);
    key.position.set(-2.4, 3, 3);
    scene.add(key);
    scene.add(new THREE.AmbientLight(0xffffff, 0.34));
    var rim = new THREE.DirectionalLight(0xffffff, 0.5);
    rim.position.set(2.2, -2.2, -3.0);
    scene.add(rim);

    resize(canvas);
    window.addEventListener("resize", function () { resize(canvas); });
    ready = true;
    loop();
    return true;
  }

  function resize(canvas) {
    var r = canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(r.width));
    var h = Math.max(1, Math.round(r.height));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    var now = performance.now();

    if (tumbling) {
      sphere.rotation.x += spin.x;
      sphere.rotation.y += spin.y;
      sphere.rotation.z += spin.z;
      if (now - t0 > 1100) { tumbling = false; settling = true; t0 = now; }
    } else if (settling) {
      // Ease every axis back to zero so the window faces the camera square-on.
      sphere.rotation.x += (0 - sphere.rotation.x) * 0.12;
      sphere.rotation.y += (0 - sphere.rotation.y) * 0.12;
      sphere.rotation.z += (0 - sphere.rotation.z) * 0.12;
      if (Math.abs(sphere.rotation.x) + Math.abs(sphere.rotation.y) + Math.abs(sphere.rotation.z) < 0.01) {
        sphere.rotation.set(0, 0, 0);
        settling = false;
      }
    } else {
      // Idle: a slow drift so the thing looks alive without demanding attention.
      sphere.rotation.y = Math.sin(now / 3200) * 0.09;
      sphere.rotation.x = Math.sin(now / 4700) * 0.05;
    }

    renderer.render(scene, camera);
  }

  function shake() {
    if (!ready || reduced) return reduced ? 260 : 0;
    var s = function () { return (Math.random() - 0.5) * 0.44; };
    spin = { x: s(), y: s() + 0.3, z: s() };
    tumbling = true;
    t0 = performance.now();
    return 1100;
  }

  return {
    init: init,
    shake: shake,
    get available() { return ready; },
    get reduced() { return reduced; }
  };
})();
