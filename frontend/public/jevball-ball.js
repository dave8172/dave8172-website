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
  var phase = "idle";          // idle -> tumble -> turn -> idle
  var t0 = 0;
  var from = { x: 0, y: 0, z: 0 };
  var to = { x: 0, y: 0, z: 0 };

  var TUMBLE_MS = 850;
  var TURN_MS = 750;

  // Ease-out cubic: fast at first, gliding into rest. A linear turn reads
  // mechanical; this reads like a weighted object settling.
  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  function lerp(a, b, t) { return a + (b - a) * t; }

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

    var R = 1.35;
    var geo = new THREE.SphereGeometry(R, 64, 48);
    var mat = new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.34, metalness: 0.08 });
    sphere = new THREE.Mesh(geo, mat);
    scene.add(sphere);

    // The printed disc, as real geometry parented to the sphere so it turns
    // with it. Without this the tumble is invisible: a featureless black ball
    // looks identical from every angle and only the specular highlight moves.
    // This is the job the "8" does on a real ball — the reference that makes
    // the rotation readable.
    //
    // A spherical cap, not a flat circle. A flat disc cannot sit flush on a
    // sphere: placed inside the radius it is swallowed by the surface, and
    // placed outside it floats like a plate once the ball turns. The cap hugs
    // the surface at every angle.
    //
    // Half-angle is derived, not eyeballed: asin(r / R) where r is the world
    // radius that projects to ~37% of the canvas at fov 38 and camera z 4.4 —
    // the same fraction the HTML answer text is sized against.
    var CAP = 0.2978;
    var disc = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.004, 48, 24, 0, Math.PI * 2, 0, CAP),
      new THREE.MeshBasicMaterial({ color: 0xf2efe6 })
    );
    // The cap is built around +Y; tip it to face the camera.
    disc.rotation.x = Math.PI / 2;
    sphere.add(disc);

    // A dark rim just under it, so the disc reads as printed rather than pasted
    // on as it turns toward the edge.
    var ring = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.002, 48, 24, 0, Math.PI * 2, 0, CAP * 1.075),
      new THREE.MeshBasicMaterial({ color: 0x0b0b0b })
    );
    ring.rotation.x = Math.PI / 2;
    sphere.add(ring);

    // Key light high-left, a dim fill so the unlit side is not a void, and a
    // neutral rim to separate the ball from a warm paper background.
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

    if (phase === "tumble") {
      sphere.rotation.x += spin.x;
      sphere.rotation.y += spin.y;
      sphere.rotation.z += spin.z;
      if (now - t0 > TUMBLE_MS) {
        // Hand off to a deliberate turn. The target is a whole number of turns
        // past where the tumble happened to stop, so the ball always rotates
        // forwards into place rather than snapping back the short way.
        phase = "turn";
        t0 = now;
        from = { x: sphere.rotation.x, y: sphere.rotation.y, z: sphere.rotation.z };
        to = { x: 0, y: Math.ceil(sphere.rotation.y / (Math.PI * 2) + 0.5) * Math.PI * 2, z: 0 };
      }
    } else if (phase === "turn") {
      var k = ease(Math.min(1, (now - t0) / TURN_MS));
      sphere.rotation.x = lerp(from.x, to.x, k);
      sphere.rotation.y = lerp(from.y, to.y, k);
      sphere.rotation.z = lerp(from.z, to.z, k);
      if (k >= 1) { sphere.rotation.set(0, 0, 0); phase = "idle"; }
    } else {
      // Idle: a slow drift so the thing looks alive without demanding attention.
      sphere.rotation.y = Math.sin(now / 3200) * 0.09;
      sphere.rotation.x = Math.sin(now / 4700) * 0.05;
    }

    renderer.render(scene, camera);
  }

  // Returns how long the caller should wait before revealing the answer, so the
  // reveal never beats the animation however fast the API replied.
  function shake() {
    if (reduced) return 260;
    if (!ready) return 0;
    var s = function () { return (Math.random() - 0.5) * 0.5; };
    spin = { x: s(), y: s() + 0.34, z: s() };
    phase = "tumble";
    t0 = performance.now();
    return TUMBLE_MS + TURN_MS;
  }

  return {
    init: init,
    shake: shake,
    get available() { return ready; },
    get reduced() { return reduced; }
  };
})();
