/* Visualiseur 3D des structures AMASSS — WebGL2, sans dépendance.

   Pourquoi pas three.js : son GLTFLoader passe par fetch(), bloqué en
   file://, et le site doit s'ouvrir sans serveur. Il faudrait donc lui
   passer les buffers à la main de toute façon — il ne resterait que 600 Ko
   de bibliothèque pour une orbite et un picking.

   La géométrie vient de assets/amasss-mesh.js (window.AMASSS_MESH), généré
   par amasss_mesh.py depuis le scan de test PUBLIÉ. Positions uint16 sur une
   boîte commune, normales int8, indices uint16.

   Le contenu éditorial n'est pas ici : il est en HTML dans la page, donc
   traduit par i18n.py, indexé par la recherche et imprimable. Ce fichier ne
   fait que peindre, sélectionner et synchroniser. Sans WebGL2, la page reste
   entière : le canvas disparaît, la liste demeure.

   La sélection se fait par passe d'identifiants — chaque pièce est repeinte
   dans un tampon hors écran avec une couleur qui EST son numéro, puis on lit
   le pixel sous le curseur. Plus robuste et plus court qu'un lancer de rayon
   côté CPU, et insensible à la densité du maillage. */
(function () {
  "use strict";

  /* LABEL_COLORS de AMASSS_CLI.py — ce sont les couleurs du code, pas des
     couleurs décoratives : c'est tout l'intérêt de les montrer.
     UAW y vaut (0,0,0). Un volume d'air noir sur fond sombre est invisible,
     donc on l'affiche en gris-bleu et la légende le dit. */
  var COLORS = {
    MAND: [216, 101,  79],
    CB:   [128, 174, 128],
    UAW:  [140, 170, 190],   /* 0,0,0 dans le code — substitué pour être visible */
    MAX:  [230, 220,  70],
    CV:   [111, 184, 210]
  };
  var TRANSLUCENT = { UAW: 0.55 };   /* l'air se regarde à travers */

  var VERT = [
    "#version 300 es",
    "in vec3 aPos; in vec3 aNrm;",
    "uniform mat4 uMVP; uniform mat4 uModel;",
    "out vec3 vNrm; out vec3 vPos;",
    "void main(){",
    "  vec3 p = aPos - 0.5;",              /* uint16 normalisé -> centré */
    "  vNrm = mat3(uModel) * aNrm;",
    "  vPos = p;",
    "  gl_Position = uMVP * vec4(p, 1.0);",
    "}"
  ].join("\n");

  var FRAG = [
    "#version 300 es",
    "precision highp float;",
    "in vec3 vNrm; in vec3 vPos;",
    "uniform vec3 uColor; uniform float uAlpha;",
    "uniform float uDim;",                 /* 1 = en avant, 0 = estompé */
    "uniform vec3 uSky; uniform vec3 uGround;",
    "out vec4 o;",
    "void main(){",
    "  vec3 n = normalize(vNrm);",
    "  vec3 L = normalize(vec3(0.4, 0.75, 0.6));",
    "  float lam = max(dot(n, L), 0.0);",
    /* hémisphérique : le ciel par le haut, un rebond par le bas */
    "  float hemi = n.y * 0.5 + 0.5;",
    "  vec3 amb = mix(uGround, uSky, hemi);",
    /* liseré pour décoller la silhouette du fond */
    "  float rim = pow(1.0 - max(dot(n, normalize(-vPos)), 0.0), 3.0);",
    "  vec3 c = uColor * (amb + lam * 0.72) + rim * 0.18;",
    "  c = mix(vec3(dot(c, vec3(0.299,0.587,0.114))) * 0.68, c, uDim);",
    "  o = vec4(c, uAlpha * mix(0.30, 1.0, uDim));",
    "}"
  ].join("\n");

  var PICK_FRAG = [
    "#version 300 es",
    "precision highp float;",
    "uniform float uId;",
    "out vec4 o;",
    "void main(){ o = vec4(uId / 255.0, 0.0, 0.0, 1.0); }"
  ].join("\n");

  /* ---------- petite algèbre : pas de bibliothèque pour 4 matrices ------- */
  function mul(a, b) {
    var r = new Float32Array(16), i, j, k, s;
    for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) {
      s = 0; for (k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k];
      r[i * 4 + j] = s;
    }
    return r;
  }
  function perspective(fov, asp, n, f) {
    var t = 1 / Math.tan(fov / 2), r = new Float32Array(16);
    r[0] = t / asp; r[5] = t; r[10] = (f + n) / (n - f);
    r[11] = -1; r[14] = 2 * f * n / (n - f);
    return r;
  }
  function lookAt(eye, ctr, up) {
    var z = norm(sub(eye, ctr)), x = norm(cross(up, z)), y = cross(z, x);
    return new Float32Array([
      x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
      -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]);
  }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function norm(a) {
    var l = Math.sqrt(dot(a, a)) || 1; return [a[0] / l, a[1] / l, a[2] / l];
  }

  function b64(s) {
    var bin = atob(s), n = bin.length, u = new Uint8Array(n), i;
    for (i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
    return u;
  }

  function shader(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(sh));
    }
    return sh;
  }
  function program(gl, vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, shader(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(p, shader(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(p));
    }
    return p;
  }

  /* --------------------------------------------------------------------- */
  function build(fig) {
    var data = window.AMASSS_MESH;
    var stage = fig.querySelector(".v3d-stage");
    var list = fig.querySelector(".v3d-parts");
    if (!data || !stage || !list) { return; }

    var canvas = document.createElement("canvas");
    var gl = canvas.getContext("webgl2", { antialias: true, alpha: true });
    if (!gl) { return; }           /* pas de WebGL2 : la liste suffit */

    stage.insertBefore(canvas, stage.firstChild);
    fig.classList.add("v3d-on");

    var prog = program(gl, VERT, FRAG);
    var pick = program(gl, VERT, PICK_FRAG);
    var u = {
      mvp: gl.getUniformLocation(prog, "uMVP"),
      model: gl.getUniformLocation(prog, "uModel"),
      color: gl.getUniformLocation(prog, "uColor"),
      alpha: gl.getUniformLocation(prog, "uAlpha"),
      dim: gl.getUniformLocation(prog, "uDim"),
      sky: gl.getUniformLocation(prog, "uSky"),
      ground: gl.getUniformLocation(prog, "uGround")
    };
    var pu = {
      mvp: gl.getUniformLocation(pick, "uMVP"),
      model: gl.getUniformLocation(pick, "uModel"),
      id: gl.getUniformLocation(pick, "uId")
    };

    /* ---- les pièces ---- */
    var parts = [], codes = Object.keys(data.parts);
    codes.forEach(function (code, i) {
      var p = data.parts[code];
      var vao = gl.createVertexArray();
      gl.bindVertexArray(vao);

      var pb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, pb);
      gl.bufferData(gl.ARRAY_BUFFER, b64(p.pos), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.UNSIGNED_SHORT, true, 0, 0);

      var nb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, nb);
      gl.bufferData(gl.ARRAY_BUFFER, b64(p.nrm), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 3, gl.BYTE, true, 0, 0);

      var ib = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, b64(p.idx), gl.STATIC_DRAW);
      gl.bindVertexArray(null);

      var c = COLORS[code] || [180, 180, 180];
      parts.push({
        code: code, vao: vao, count: p.tris * 3, id: i + 1,
        color: [c[0] / 255, c[1] / 255, c[2] / 255],
        alpha: TRANSLUCENT[code] || 1.0,
        row: list.querySelector('[data-part="' + code + '"]')
      });
    });

    /* ---- tampon de sélection ---- */
    var fb = gl.createFramebuffer(), pickTex = gl.createTexture(),
        pickDepth = gl.createRenderbuffer(), pickW = 0, pickH = 0;

    function sizePick(w, h) {
      if (w === pickW && h === pickH) { return; }
      pickW = w; pickH = h;
      gl.bindTexture(gl.TEXTURE_2D, pickTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.bindRenderbuffer(gl.RENDERBUFFER, pickDepth);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pickTex, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, pickDepth);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    /* ---- caméra ---- */
    var cam = { yaw: -0.5, pitch: 0.12, dist: 1.50, tx: 0, ty: 0, tz: 0 };
    var goal = null, selected = null, dirty = true;

    /* Le NIfTI sort en LPS : Z monte, Y va vers l'arrière. On redresse le
       crâne une fois pour toutes plutôt que de tourner la caméra. */
    /* Colonnes, convention WebGL : (x,y,z) -> (x, z, -y). Le NIfTI a l'axe Z
       vers le haut (supérieur) ; GL veut Y. centroidOf() applique le même
       redressement — les deux doivent rester d'accord, sinon la caméra vise
       une pièce et le crâne en montre une autre. */
    var MODEL = new Float32Array([
      1, 0,  0, 0,
      0, 0, -1, 0,
      0, 1,  0, 0,
      0, 0,  0, 1
    ]);

    function centroidOf(part) {
      /* approximation suffisante pour viser : le centre de la boîte de la
         pièce, recalculé une fois depuis ses positions quantifiées */
      if (part.centre) { return part.centre; }
      var p = data.parts[part.code], raw = b64(p.pos);
      var v = new Uint16Array(raw.buffer, raw.byteOffset, raw.length / 2);
      var lo = [65535, 65535, 65535], hi = [0, 0, 0], i, k;
      for (i = 0; i < v.length; i += 3) {
        for (k = 0; k < 3; k++) {
          if (v[i + k] < lo[k]) { lo[k] = v[i + k]; }
          if (v[i + k] > hi[k]) { hi[k] = v[i + k]; }
        }
      }
      var c = [];
      for (k = 0; k < 3; k++) { c[k] = (lo[k] + hi[k]) / 2 / 65535 - 0.5; }
      /* le même redressement que MODEL */
      part.centre = [c[0], c[2], -c[1]];
      part.radius = Math.max(
        (hi[0] - lo[0]), (hi[1] - lo[1]), (hi[2] - lo[2])) / 65535;
      return part.centre;
    }

    var reduced = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function select(code, fromList) {
      selected = code;
      parts.forEach(function (p) {
        if (p.row) { p.row.setAttribute("aria-current", p.code === code ? "true" : "false"); }
      });
      fig.classList.toggle("v3d-has-sel", !!code);
      if (code) {
        var part = parts.filter(function (p) { return p.code === code; })[0];
        var c = centroidOf(part);
        goal = { tx: c[0], ty: c[1], tz: c[2], dist: Math.max(0.55, part.radius * 2.4) };
      } else {
        goal = { tx: 0, ty: 0, tz: 0, dist: 1.50 };
      }
      if (reduced) { cam.tx = goal.tx; cam.ty = goal.ty; cam.tz = goal.tz; cam.dist = goal.dist; goal = null; }
      if (fromList && part) { /* rien : la liste garde le focus */ }
      dirty = true; tick();
    }

    /* ---- interactions ---- */
    var drag = null;
    canvas.addEventListener("pointerdown", function (e) {
      drag = { x: e.clientX, y: e.clientY, moved: 0 };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", function (e) {
      if (!drag) { return; }
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      cam.yaw += dx * 0.008;
      cam.pitch = Math.max(-1.45, Math.min(1.45, cam.pitch + dy * 0.008));
      drag.x = e.clientX; drag.y = e.clientY;
      goal = null; dirty = true; tick();
    });
    canvas.addEventListener("pointerup", function (e) {
      var wasClick = drag && drag.moved < 6;
      drag = null;
      if (wasClick) { select(pickAt(e), false); }
    });
    canvas.addEventListener("wheel", function (e) {
      e.preventDefault();
      cam.dist = Math.max(0.35, Math.min(4, cam.dist * (1 + Math.sign(e.deltaY) * 0.12)));
      goal = null; dirty = true; tick();
    }, { passive: false });

    list.addEventListener("click", function (e) {
      var row = e.target.closest ? e.target.closest("[data-part]") : null;
      if (!row) { return; }
      e.preventDefault();
      select(row.getAttribute("data-part") === selected ? null : row.getAttribute("data-part"), true);
    });
    list.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") { return; }
      var row = e.target.closest ? e.target.closest("[data-part]") : null;
      if (!row) { return; }
      e.preventDefault();
      select(row.getAttribute("data-part") === selected ? null : row.getAttribute("data-part"), true);
    });

    var reset = fig.querySelector(".v3d-reset");
    if (reset) { reset.addEventListener("click", function () { select(null, false); }); }

    function pickAt(e) {
      var r = canvas.getBoundingClientRect();
      var x = Math.round((e.clientX - r.left) * canvas.width / r.width);
      var y = Math.round((r.bottom - e.clientY) * canvas.height / r.height);
      sizePick(canvas.width, canvas.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
      gl.useProgram(pick);
      var mvp = matrices();
      gl.uniformMatrix4fv(pu.mvp, false, mvp);
      gl.uniformMatrix4fv(pu.model, false, MODEL);
      parts.forEach(function (p) {
        gl.uniform1f(pu.id, p.id);
        gl.bindVertexArray(p.vao);
        gl.drawElements(gl.TRIANGLES, p.count, gl.UNSIGNED_SHORT, 0);
      });
      var px = new Uint8Array(4);
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      dirty = true;
      var hit = parts.filter(function (p) { return p.id === px[0]; })[0];
      return hit ? hit.code : null;
    }

    function matrices() {
      var cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
      var eye = [
        cam.tx + cam.dist * cp * Math.sin(cam.yaw),
        cam.ty + cam.dist * sp,
        cam.tz + cam.dist * cp * Math.cos(cam.yaw)
      ];
      var view = lookAt(eye, [cam.tx, cam.ty, cam.tz], [0, 1, 0]);
      var proj = perspective(0.85, canvas.width / canvas.height || 1, 0.02, 12);
      return mul(proj, mul(view, MODEL));
    }

    function themeLight() {
      /* le fond du thème décide de l'éclairage ambiant : une pièce claire sur
         fond clair doit rester lisible, et inversement */
      var bg = getComputedStyle(fig).getPropertyValue("--v3d-sky").trim();
      return bg === "dark" ? [[0.22, 0.25, 0.30], [0.05, 0.06, 0.08]]
                           : [[0.62, 0.65, 0.70], [0.26, 0.24, 0.22]];
    }

    function draw() {
      var r = stage.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = Math.max(1, Math.round(r.width * dpr));
      var h = Math.max(1, Math.round(r.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(prog);
      var lights = themeLight();
      gl.uniform3fv(u.sky, lights[0]);
      gl.uniform3fv(u.ground, lights[1]);
      gl.uniformMatrix4fv(u.mvp, false, matrices());
      gl.uniformMatrix4fv(u.model, false, MODEL);

      /* opaques d'abord, translucides ensuite : sinon l'air masque l'os */
      var order = parts.slice().sort(function (a, b) { return b.alpha - a.alpha; });
      order.forEach(function (p) {
        gl.uniform3fv(u.color, p.color);
        gl.uniform1f(u.alpha, p.alpha);
        gl.uniform1f(u.dim, (!selected || selected === p.code) ? 1.0 : 0.0);
        gl.bindVertexArray(p.vao);
        gl.drawElements(gl.TRIANGLES, p.count, gl.UNSIGNED_SHORT, 0);
      });
      gl.bindVertexArray(null);
    }

    var running = false;
    function tick() {
      if (running) { return; }
      running = true;
      requestAnimationFrame(function step() {
        if (goal) {
          var k = 0.16, done = true;
          ["tx", "ty", "tz", "dist"].forEach(function (f) {
            var d = goal[f] - cam[f];
            if (Math.abs(d) > 0.0008) { done = false; }
            cam[f] += d * k;
          });
          if (done) { goal = null; } else { dirty = true; }
        }
        if (dirty) { draw(); dirty = false; }
        if (goal) { requestAnimationFrame(step); } else { running = false; }
      });
    }

    var ro = window.ResizeObserver ? new ResizeObserver(function () {
      dirty = true; tick();
    }) : null;
    if (ro) { ro.observe(stage); }
    window.addEventListener("resize", function () { dirty = true; tick(); });

    /* Ne peindre que quand c'est à l'écran : une fiche Atlas est longue. */
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { dirty = true; tick(); }
      }, { rootMargin: "200px" }).observe(fig);
    } else { tick(); }
    tick();
  }

  function init() {
    var figs = document.querySelectorAll("[data-amasss-3d]");
    for (var i = 0; i < figs.length; i++) {
      try { build(figs[i]); } catch (err) {
        /* un shader qui ne compile pas ne doit pas emporter la page */
        if (window.console) { console.warn("visualiseur 3D indisponible :", err); }
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
