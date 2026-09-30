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
  var RAW_COLOR = [196, 190, 180];   /* le scan brut seuillé : sans nom, sans couleur */
  var EXPLODE = 0.16;                /* de combien les autres pièces s'écartent */

  var VERT = [
    "#version 300 es",
    "in vec3 aPos; in vec3 aNrm;",
    "uniform mat4 uMVP; uniform mat4 uModel; uniform vec3 uOffset;",
    "out vec3 vNrm; out vec3 vPos;",
    "void main(){",
    "  vec3 p = aPos - 0.5 + uOffset;",              /* uint16 normalisé -> centré */
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
    "uniform float uSweep;",
    "uniform float uDim;",                 /* 1 = en avant, 0 = estompé */
    "uniform vec3 uSky; uniform vec3 uGround;",
    "out vec4 o;",
    "void main(){",
    /* Balayage : la structure n'existe qu'en dessous du plan. C'est la
       fenetre glissante de nnU-Net rendue visible — l'inference ne produit
       pas un volume d'un coup, elle parcourt le scan. */
    "  if (vPos.z > uSweep) { discard; }",
    "  vec3 n = normalize(vNrm);",
    "  vec3 L = normalize(vec3(0.4, 0.75, 0.6));",
    "  float lam = max(dot(n, L), 0.0);",
    /* hémisphérique : le ciel par le haut, un rebond par le bas */
    "  float hemi = n.y * 0.5 + 0.5;",
    "  vec3 amb = mix(uGround, uSky, hemi);",
    /* liseré pour décoller la silhouette du fond */
    "  float rim = pow(1.0 - max(dot(n, normalize(-vPos)), 0.0), 3.0);",
    "  vec3 c = uColor * (amb + lam * 0.72) + rim * 0.18;",
    /* Bande lumineuse au front du balayage : ce qui vient d'etre produit. */
    "  float band = smoothstep(0.075, 0.0, uSweep - vPos.z);",
    "  c += band * 0.9;",
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
      offset: gl.getUniformLocation(prog, "uOffset"),
      sky: gl.getUniformLocation(prog, "uSky"),
      sweep: gl.getUniformLocation(prog, "uSweep"),
      ground: gl.getUniformLocation(prog, "uGround")
    };
    var pu = {
      mvp: gl.getUniformLocation(pick, "uMVP"),
      model: gl.getUniformLocation(pick, "uModel"),
      offset: gl.getUniformLocation(pick, "uOffset"),
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

      var c = COLORS[code] || RAW_COLOR;
      parts.push({
        code: code, vao: vao, count: p.tris * 3, id: i + 1,
        color: [c[0] / 255, c[1] / 255, c[2] / 255],
        alpha: TRANSLUCENT[code] || 1.0,
        /* centre et rayon viennent du generateur, deja normalises : le
           navigateur n'a pas a reparcourir des milliers de sommets. */
        c: p.c || [0, 0, 0], r: p.r || 0.5,
        isRaw: code === "RAW",
        /* gen : 0 = pas encore produite par le reseau, 1 = produite.
           Vaut 1 au repos — la simulation est un supplement, pas un prealable. */
        gen: 1, on: true,
        off: [0, 0, 0], offGoal: [0, 0, 0],
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
    /* Le cadrage au repos vise l'anatomie seule : le scan brut la déborde
       largement, et s'y cadrer rendrait les structures minuscules. */
    var focus = data.focus || { c: [0, 0, 0], r: 0.42 };
    /* r est un rayon (demi-étendue), pas une dimension pleine : le facteur
       cadre la pièce avec un peu d'air autour, rien de plus. */
    var HOME = { c: [focus.c[0], focus.c[2], -focus.c[1]],
                 dist: Math.max(0.75, focus.r * 2.9) };
    var cam = { yaw: -0.5, pitch: 0.12, dist: HOME.dist,
                tx: HOME.c[0], ty: HOME.c[1], tz: HOME.c[2] };
    var goal = null, selected = null, hovered = null, dirty = true;
    /* 0 = scan brut seul, 1 = structures seules. L'animation entre les deux
       est le propos : AMASSS ne fait pas apparaître de la matière, il la
       nomme et la sépare. */
    var reveal = 1, revealGoal = 1, played = false, revealT0 = 0, lastT = 0;

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

    var reduced = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function byCode(code) {
      return parts.filter(function (p) { return p.code === code; })[0];
    }

    function select(code) {
      selected = code;
      parts.forEach(function (p) {
        if (p.row) { p.row.setAttribute("aria-current", p.code === code ? "true" : "false"); }
      });
      fig.classList.toggle("v3d-has-sel", !!code);

      var part = code ? byCode(code) : null;
      if (part) {
        /* La caméra vise dans le repère redressé ; les décalages, eux, sont
           appliqués AVANT la rotation, dans le shader. Deux repères, pas un. */
        goal = { tx: part.c[0], ty: part.c[2], tz: -part.c[1],
                 dist: Math.max(0.42, part.r * 3.1) };
      } else {
        goal = { tx: HOME.c[0], ty: HOME.c[1], tz: HOME.c[2], dist: HOME.dist };
      }

      /* Vue éclatée : les autres pièces s'écartent en s'éloignant du centre
         de la sélection, ce qui dégage ce qu'on regarde sans le déplacer. */
      parts.forEach(function (p) {
        if (!part || p === part || p.isRaw) { p.offGoal = [0, 0, 0]; return; }
        var d = [p.c[0] - part.c[0], p.c[1] - part.c[1], p.c[2] - part.c[2]];
        var l = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
        if (l < 1e-4) { p.offGoal = [0, EXPLODE, 0]; return; }
        p.offGoal = [d[0] / l * EXPLODE, d[1] / l * EXPLODE, d[2] / l * EXPLODE];
      });

      if (reduced) {
        cam.tx = goal.tx; cam.ty = goal.ty; cam.tz = goal.tz; cam.dist = goal.dist;
        goal = null;
        parts.forEach(function (p) { p.off = p.offGoal.slice(); });
      }
      dirty = true; tick();
    }

    function setHover(code) {
      if (code === hovered) { return; }
      hovered = code;
      canvas.style.cursor = code ? "pointer" : "";
      parts.forEach(function (p) {
        if (p.row) { p.row.classList.toggle("v3d-hover", p.code === hovered); }
      });
      dirty = true; tick();
    }

    /* ---- Simulation d'une passe AMASSS -------------------------------
       Fidèle à ce que la fiche Atlas décrit : un réseau binaire PAR
       structure, chargé puis appliqué, en boucle. Décocher une structure ne
       produit rien — c'est exactement ce que fait le module. */
    var SIM = { intro: 800, load: 430, sweep: 1000, gap: 170, outro: 650 };
    var sim = null;
    var statusEl = fig.querySelector(".v3d-status");
    var strings = {};
    var pot = fig.querySelectorAll(".v3d-i18n [data-k]");
    for (var si = 0; si < pot.length; si++) {
      strings[pot[si].getAttribute("data-k")] = pot[si].textContent.trim();
    }
    function say(txt) { if (statusEl) { statusEl.textContent = txt || ""; } }
    function nameOf(code) {
      var p = byCode(code), el = p && p.row && p.row.querySelector(".v3d-name");
      return el ? el.textContent.trim() : code;
    }

    function runSim() {
      var codes = [];
      parts.forEach(function (p) {
        if (p.isRaw) { return; }
        var chk = p.row && p.row.querySelector(".v3d-chk");
        p.on = chk ? chk.checked : true;
        p.gen = 0;
        if (p.on) { codes.push(p.code); }
      });
      if (!codes.length) {
        /* Rien de coché : le module ne produirait rien non plus. */
        parts.forEach(function (p) { p.gen = 1; p.on = true; });
        say(strings.empty || "");
        dirty = true; tick();
        return;
      }
      select(null);
      reveal = 1; revealGoal = 1; revealT0 = 0;
      sim = { codes: codes, i: -1, phase: "intro", t: 0, rawA: 0.92 };
      fig.classList.add("v3d-sim");
      say(strings.reading || "");
      dirty = true; tick();
    }

    function simStep(dt) {
      sim.t += dt;
      if (sim.phase === "intro") {
        sim.rawA = 0.92 - 0.60 * Math.min(1, sim.t / SIM.intro);
        if (sim.t >= SIM.intro) {
          sim.i = 0; sim.phase = "load"; sim.t = 0;
          say((strings.loading || "") + " " + nameOf(sim.codes[0]));
        }
        return;
      }
      if (sim.phase === "load") {
        if (sim.t >= SIM.load) {
          sim.phase = "sweep"; sim.t = 0;
          say((strings.infer || "") + " " + nameOf(sim.codes[sim.i]));
        }
        return;
      }
      if (sim.phase === "sweep") {
        var part = byCode(sim.codes[sim.i]);
        part.gen = Math.min(1, sim.t / SIM.sweep);
        if (sim.t >= SIM.sweep + SIM.gap) {
          part.gen = 1; sim.i += 1; sim.t = 0;
          if (sim.i >= sim.codes.length) {
            sim.phase = "outro";
            say(sim.codes.length + " " + (strings.finished || ""));
          } else {
            sim.phase = "load";
            say((strings.loading || "") + " " + nameOf(sim.codes[sim.i]));
          }
        }
        return;
      }
      /* outro : le scan d'entrée s'efface, il ne reste que ce qui a été produit */
      sim.rawA = 0.32 * (1 - Math.min(1, sim.t / SIM.outro));
      if (sim.t >= SIM.outro) {
        sim = null;
        fig.classList.remove("v3d-sim");
      }
    }

    /* ---- interactions ---- */
    var drag = null;
    canvas.addEventListener("pointerdown", function (e) {
      drag = { x: e.clientX, y: e.clientY, moved: 0 };
      canvas.setPointerCapture(e.pointerId);
    });
    var hoverAt = null, hoverQueued = false;
    canvas.addEventListener("pointerleave", function () { setHover(null); });
    canvas.addEventListener("pointermove", function (e) {
      if (!drag) {
        /* Le picking relit un pixel du GPU : ca bloque le pipeline. Une passe
           par image au maximum, et jamais pendant l'animation de revelation. */
        if (reveal < 0.999 || sim) { return; }
        hoverAt = { clientX: e.clientX, clientY: e.clientY };
        if (!hoverQueued) {
          hoverQueued = true;
          requestAnimationFrame(function () {
            hoverQueued = false;
            if (hoverAt) { setHover(pickAt(hoverAt)); }
          });
        }
        return;
      }
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      /* Le modèle suit la souris : on tire vers la droite, le crâne tourne
         vers la droite — donc la caméra orbite vers la GAUCHE, et le lacet
         décroît. L'inverse donnait la sensation d'une souris inversée. */
      cam.yaw -= dx * 0.008;
      cam.pitch = Math.max(-1.45, Math.min(1.45, cam.pitch + dy * 0.008));
      drag.x = e.clientX; drag.y = e.clientY;
      goal = null; dirty = true; tick();
    });
    canvas.addEventListener("pointerup", function (e) {
      var wasClick = drag && drag.moved < 6;
      drag = null;
      if (wasClick) {
        var hit = pickAt(e);
        select(hit === selected ? null : hit);
      }
    });
    canvas.addEventListener("wheel", function (e) {
      e.preventDefault();
      cam.dist = Math.max(0.35, Math.min(4, cam.dist * (1 + Math.sign(e.deltaY) * 0.12)));
      goal = null; dirty = true; tick();
    }, { passive: false });

    list.addEventListener("click", function (e) {
      /* La case à cocher choisit un modèle ; le reste de la ligne sélectionne
         une pièce. Deux gestes distincts sur la même ligne. */
      if (e.target.classList && e.target.classList.contains("v3d-chk")) { return; }
      var row = e.target.closest ? e.target.closest("[data-part]") : null;
      if (!row) { return; }
      e.preventDefault();
      select(row.getAttribute("data-part") === selected ? null : row.getAttribute("data-part"));
    });
    list.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") { return; }
      var row = e.target.closest ? e.target.closest("[data-part]") : null;
      if (!row) { return; }
      e.preventDefault();
      select(row.getAttribute("data-part") === selected ? null : row.getAttribute("data-part"));
    });

    var go = fig.querySelector(".v3d-go");
    if (go) { go.addEventListener("click", function () { runSim(); }); }
    /* Cocher ou décocher ne relance pas : on choisit, puis on lance. */
    list.addEventListener("change", function (e) {
      if (e.target.classList.contains("v3d-chk")) { say(""); }
    });

    var reset = fig.querySelector(".v3d-reset");
    if (reset) { reset.addEventListener("click", function () { select(null); }); }

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
        /* Ni le scan d'entrée, ni une structure que le réseau n'a pas
           encore produite : on ne clique que ce qui existe. */
        if (p.isRaw || p.gen <= 0 || !p.on) { return; }
        gl.uniform1f(pu.id, p.id);
        gl.uniform3fv(pu.offset, p.off);
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

      /* Opaques d'abord, translucides ensuite, et le scan brut en dernier :
         il enveloppe tout le reste, donc il doit se fondre par-dessus. */
      var order = parts.slice().sort(function (a, b) {
        if (a.isRaw !== b.isRaw) { return a.isRaw ? 1 : -1; }
        return b.alpha - a.alpha;
      });
      order.forEach(function (p) {
        var rawA = sim ? sim.rawA : 0.92 * (1 - reveal);
        var a = p.isRaw ? rawA : p.alpha * reveal * (p.on ? 1 : 0);
        if (a < 0.004 || (!p.isRaw && p.gen <= 0)) { return; }
        /* Hors balayage, on pousse le plan au-dela du modele : rien n'est coupe. */
        gl.uniform1f(u.sweep, p.gen >= 1 ? 9.0 : -0.62 + 1.30 * p.gen);         /* invisible : ne pas le peindre */
        var dim = (!selected || selected === p.code) ? 1.0 : 0.0;
        if (!p.isRaw && p.code === hovered && dim === 1.0) { dim = 1.22; }
        gl.uniform3fv(u.color, p.color);
        gl.uniform1f(u.alpha, a);
        gl.uniform1f(u.dim, dim);
        gl.uniform3fv(u.offset, p.off);
        gl.bindVertexArray(p.vao);
        gl.drawElements(gl.TRIANGLES, p.count, gl.UNSIGNED_SHORT, 0);
      });
      gl.bindVertexArray(null);
    }

    var running = false;
    function tick() {
      if (running) { return; }
      running = true;
      requestAnimationFrame(function step(now) {
        var busy = false;
        /* Tout est calé sur le temps écoulé, pas sur le nombre d'images :
           sinon l'animation dure deux secondes sur une bonne carte et quinze
           sur un rendu logiciel. dt est borné pour survivre à un onglet
           réveillé après une minute en arrière-plan. */
        var dt = lastT ? (now - lastT) : 16.7;
        /* Une horloge qui n'avance pas — onglet suspendu, rendu instrumenté —
           ne doit pas figer l'animation : on compte alors une image nominale. */
        if (!(dt > 0)) { dt = 16.7; }
        if (dt > 64) { dt = 64; }
        lastT = now;
        var ease = function (base) { return 1 - Math.pow(1 - base, dt / 16.7); };

        if (goal) {
          var k = ease(0.16), done = true;
          ["tx", "ty", "tz", "dist"].forEach(function (f) {
            var d = goal[f] - cam[f];
            if (Math.abs(d) > 0.0008) { done = false; }
            cam[f] += d * k;
          });
          if (done) { goal = null; } else { busy = true; }
        }
        var ko = ease(0.16);
        parts.forEach(function (p) {
          for (var i = 0; i < 3; i++) {
            var d = p.offGoal[i] - p.off[i];
            if (Math.abs(d) > 0.0004) { busy = true; }
            p.off[i] += d * ko;
          }
        });
        if (sim) { simStep(dt); busy = true; }
        if (reveal !== revealGoal) {
          /* On cumule les deltas au lieu de soustraire deux horodatages :
             l'animation ne dépend plus que du temps écoulé, jamais d'une
             origine absolue. */
          revealT0 += dt;
          var t = Math.min(1, revealT0 / REVEAL_MS);
          /* départ et arrivée adoucis : on veut voir la bascule, pas un fondu */
          var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          reveal = revealGoal ? e : 1 - e;
          if (t >= 1) { reveal = revealGoal; revealT0 = 0; } else { busy = true; }
        }
        fig.classList.toggle("v3d-raw", reveal < 0.5);
        if (busy) { dirty = true; }
        if (dirty) { draw(); dirty = false; }
        if (busy) { requestAnimationFrame(step); } else { running = false; lastT = 0; }
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
        if (!es[0].isIntersecting) { return; }
        dirty = true;
        /* La demonstration se joue une fois, quand la figure arrive a l'ecran :
           personne ne clique un bouton pour comprendre de quoi on parle. */
        if (!played) {
          played = true;
          /* On joue la passe complete une fois, a l'arrivee a l'ecran :
             personne ne clique un bouton pour comprendre de quoi on parle. */
          if (!reduced) { runSim(); }
        }
        tick();
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
