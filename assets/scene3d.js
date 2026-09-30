/* scene3d.js — le socle WebGL2 commun aux visualiseurs du site.

   Pourquoi pas three.js : son GLTFLoader passe par fetch(), bloque en
   file://, et le site doit s'ouvrir sans serveur. Il faudrait lui passer les
   buffers a la main de toute facon.

   Ce fichier ne sait rien d'AMASSS ni d'ALI. Il sait : demarrer un contexte,
   televerser des pieces quantifiees, orbiter, designer au clic, et faire
   tourner une boucle calee sur le TEMPS ECOULE (jamais sur le nombre
   d'images : sinon une animation dure deux secondes sur une bonne carte et
   quinze sur un rendu logiciel).

   Chaque scene fournit son propre `onFrame(dt)` et decide, piece par piece,
   couleur / opacite / estompage / decalage / balayage.

   Format d'entree : voir webmesh.py. Positions uint16 sur une boite commune
   a toutes les pieces, normales int8, indices uint16, plus `c` (centre) et
   `e` (DEMI-etendues) par piece. Des demi-etendues : consommer une dimension
   pleine comme un rayon place la camera deux fois trop loin. */
(function (global) {
  "use strict";

  var VERT = [
    "#version 300 es",
    "in vec3 aPos; in vec3 aNrm;",
    "uniform mat4 uMVP; uniform mat4 uModel; uniform vec3 uOffset;",
    "out vec3 vNrm; out vec3 vPos;",
    "void main(){",
    "  vec3 p = aPos - 0.5 + uOffset;",
    "  vNrm = mat3(uModel) * aNrm;",
    "  vPos = p;",
    "  gl_Position = uMVP * vec4(p, 1.0);",
    "}"
  ].join("\n");

  var FRAG = [
    "#version 300 es",
    "precision highp float;",
    "in vec3 vNrm; in vec3 vPos;",
    "uniform vec3 uColor; uniform float uAlpha; uniform float uDim;",
    "uniform float uSweep; uniform vec3 uSky; uniform vec3 uGround;",
    "out vec4 o;",
    "void main(){",
    "  if (vPos.z > uSweep) { discard; }",
    "  vec3 n = normalize(vNrm);",
    "  vec3 L = normalize(vec3(0.4, 0.75, 0.6));",
    "  float lam = max(dot(n, L), 0.0);",
    "  float hemi = n.y * 0.5 + 0.5;",
    "  vec3 amb = mix(uGround, uSky, hemi);",
    "  float rim = pow(1.0 - max(dot(n, normalize(-vPos)), 0.0), 3.0);",
    "  vec3 c = uColor * (amb + lam * 0.72) + rim * 0.18;",
    "  float band = smoothstep(0.075, 0.0, uSweep - vPos.z);",
    "  c += band * 0.9;",
    "  c = mix(vec3(dot(c, vec3(0.299,0.587,0.114))) * 0.68, c, uDim);",
    "  o = vec4(c, uAlpha * mix(0.30, 1.0, uDim));",
    "}"
  ].join("\n");

  var PICK = [
    "#version 300 es",
    "precision highp float;",
    "uniform float uId;",
    "out vec4 o;",
    "void main(){ o = vec4(uId / 255.0, 0.0, 0.0, 1.0); }"
  ].join("\n");

  /* Un marqueur : point, trace ou cible. Pas de maillage, juste des
     triangles engendres a la volee — un agent n'a pas de geometrie. */
  var MARK_VERT = [
    "#version 300 es",
    "in vec2 aCorner; in vec3 aCentre; in vec4 aStyle;",  /* rgb + taille */
    "uniform mat4 uMVP; uniform mat4 uModel; uniform float uAspect;",
    "out vec2 vUV; out vec3 vCol;",
    "void main(){",
    "  vUV = aCorner; vCol = aStyle.rgb;",
    "  vec4 clip = uMVP * vec4(aCentre, 1.0);",
    /* taille constante a l'ecran : un point trop loin doit rester visible */
    "  clip.xy += aCorner * aStyle.w * vec2(1.0, uAspect) * clip.w;",
    "  gl_Position = clip;",
    "}"
  ].join("\n");

  var MARK_FRAG = [
    "#version 300 es",
    "precision highp float;",
    "in vec2 vUV; in vec3 vCol;",
    "uniform float uFade;",
    "out vec4 o;",
    "void main(){",
    "  float d = length(vUV);",
    "  if (d > 1.0) { discard; }",
    "  float edge = smoothstep(1.0, 0.72, d);",
    "  o = vec4(vCol + (1.0 - edge) * 0.35, edge * uFade);",
    "}"
  ].join("\n");

  /* Ce que le reseau d'ALI_IOS voit VRAIMENT. La texture n'est pas une
     couleur : c'est la normale par sommet remappee en RGB,
     (n*0.5+0.5)*255 (surface.py:171). D'ou ces verts et ces roses. */
  var NORMAL_FRAG = [
    "#version 300 es",
    "precision highp float;",
    "in vec3 vNrm; in vec3 vPos;",
    "uniform float uDim;",
    "out vec4 o;",
    "void main(){",
    "  vec3 n = normalize(vNrm);",
    "  o = vec4(mix(vec3(0.12), n * 0.5 + 0.5, uDim), 1.0);",
    "}"
  ].join("\n");

  /* ---- algebre : quatre matrices ne justifient pas une bibliotheque ---- */
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
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function norm(a) { var l = Math.sqrt(dot(a, a)) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  function lookAt(eye, ctr, up) {
    var z = norm(sub(eye, ctr)), x = norm(cross(up, z)), y = cross(z, x);
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0,
                             x[2], y[2], z[2], 0,
                             -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]);
  }
  function b64(s) {
    var bin = atob(s), n = bin.length, u = new Uint8Array(n), i;
    for (i = 0; i < n; i++) { u[i] = bin.charCodeAt(i); }
    return u;
  }
  function shader(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { throw new Error(gl.getShaderInfoLog(sh)); }
    return sh;
  }
  function program(gl, vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, shader(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(p, shader(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { throw new Error(gl.getProgramInfoLog(p)); }
    return p;
  }

  /* Le NIfTI a l'axe Z vers le haut ; GL veut Y. (x,y,z) -> (x, z, -y).
     Toute conversion de centre doit appliquer EXACTEMENT le meme
     redressement, sinon la camera vise une piece et la scene en montre une
     autre. `Scene3D.up()` est la pour ca — ne le refais pas a la main. */
  var MODEL = new Float32Array([1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1]);

  function Scene3D(stage, data, opts) {
    opts = opts || {};
    var canvas = document.createElement("canvas");
    var gl = canvas.getContext("webgl2", { antialias: true, alpha: true });
    if (!gl) { this.ok = false; return; }
    this.ok = true;
    stage.insertBefore(canvas, stage.firstChild);

    var self = this;
    this.gl = gl; this.canvas = canvas; this.stage = stage; this.data = data;
    this.dirty = true;
    this.hovered = null;
    this.reduced = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var prog = program(gl, VERT, FRAG);
    var pick = program(gl, VERT, PICK);
    var mark = program(gl, MARK_VERT, MARK_FRAG);
    var nrm = program(gl, VERT, NORMAL_FRAG);
    this.prog = prog; this.markProg = mark; this.normProg = nrm;
    this.nu = {};
    ["uMVP", "uModel", "uOffset", "uDim"].forEach(function (n) {
      this.nu[n] = gl.getUniformLocation(nrm, n);
    }, this);
    var u = {};
    ["uMVP", "uModel", "uColor", "uAlpha", "uDim", "uOffset", "uSweep", "uSky", "uGround"]
      .forEach(function (n) { u[n] = gl.getUniformLocation(prog, n); });
    var pu = {};
    ["uMVP", "uModel", "uOffset", "uId"]
      .forEach(function (n) { pu[n] = gl.getUniformLocation(pick, n); });
    var mu = {};
    ["uMVP", "uModel", "uAspect", "uFade"]
      .forEach(function (n) { mu[n] = gl.getUniformLocation(mark, n); });
    this.u = u; this.pu = pu; this.mu = mu; this.pickProg = pick;

    /* ---- pieces ---- */
    this.parts = [];
    this.byCode = {};
    Object.keys(data.parts).forEach(function (code, i) {
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
      var part = {
        code: code, vao: vao, count: p.tris * 3, id: i + 1,
        c: p.c || [0, 0, 0], e: p.e || [0.5, 0.5, 0.5], r: p.r || 0.5,
        color: [.7, .7, .7], alpha: 1, dim: 1, off: [0, 0, 0],
        gen: 1, visible: true, pickable: true
      };
      self.parts.push(part);
      self.byCode[code] = part;
    });

    /* ---- marqueurs : un seul tampon, reecrit a chaque image ---- */
    this.marks = [];
    var mvao = gl.createVertexArray();
    gl.bindVertexArray(mvao);
    var corners = new Float32Array([-1,-1, 1,-1, -1,1, 1,-1, 1,1, -1,1]);
    var cb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cb);
    gl.bufferData(gl.ARRAY_BUFFER, corners, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.markBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.markBuf);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 28, 12);
    gl.vertexAttribDivisor(2, 1);
    gl.bindVertexArray(null);
    this.markVao = mvao;

    /* ---- camera ---- */
    var focus = data.focus || { c: [0, 0, 0], r: 0.45 };
    this.home = { c: this.up(focus.c), dist: Math.max(0.75, focus.r * 2.9) };
    this.cam = { yaw: opts.yaw != null ? opts.yaw : -0.5,
                 pitch: opts.pitch != null ? opts.pitch : 0.12,
                 dist: this.home.dist,
                 tx: this.home.c[0], ty: this.home.c[1], tz: this.home.c[2] };
    this.goal = null;

    /* ---- tampon de designation ---- */
    this.fb = gl.createFramebuffer();
    this.pickTex = gl.createTexture();
    this.pickDepth = gl.createRenderbuffer();
    this.pickW = this.pickH = 0;

    this.onFrame = opts.onFrame || null;
    this.onOverlay = opts.onOverlay || null;
    this.onPick = opts.onPick || null;
    this.onHover = opts.onHover || null;
    this.bindInput();
    this.running = false; this.lastT = 0;
  }

  /* Le redressement du repere, au seul endroit qui le connait. */
  Scene3D.prototype.up = function (c) { return [c[0], c[2], -c[1]]; };

  Scene3D.prototype.setMarks = function (list) { this.marks = list; this.dirty = true; };

  Scene3D.prototype.lookAtPart = function (code, pad) {
    var p = this.byCode[code];
    if (!p) { return; }
    var c = this.up(p.c);
    this.goal = { tx: c[0], ty: c[1], tz: c[2], dist: Math.max(0.42, p.r * (pad || 3.1)) };
    if (this.reduced) { this.snap(); }
    this.kick();
  };
  Scene3D.prototype.lookAtPoint = function (pt, dist) {
    var c = this.up(pt);
    this.goal = { tx: c[0], ty: c[1], tz: c[2], dist: dist };
    if (this.reduced) { this.snap(); }
    this.kick();
  };
  Scene3D.prototype.lookHome = function () {
    this.goal = { tx: this.home.c[0], ty: this.home.c[1], tz: this.home.c[2],
                  dist: this.home.dist };
    if (this.reduced) { this.snap(); }
    this.kick();
  };
  Scene3D.prototype.snap = function () {
    if (!this.goal) { return; }
    var c = this.cam, g = this.goal;
    c.tx = g.tx; c.ty = g.ty; c.tz = g.tz; c.dist = g.dist;
    this.goal = null;
  };

  Scene3D.prototype.bindInput = function () {
    var self = this, canvas = this.canvas, drag = null;
    canvas.addEventListener("pointerdown", function (e) {
      drag = { x: e.clientX, y: e.clientY, moved: 0 };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", function (e) {
      if (!drag) {
        if (!self.onHover) { return; }
        self.hoverAt = { clientX: e.clientX, clientY: e.clientY };
        if (!self.hoverQueued) {
          self.hoverQueued = true;
          requestAnimationFrame(function () {
            self.hoverQueued = false;
            if (self.hoverAt) { self.onHover(self.pickAt(self.hoverAt)); }
          });
        }
        return;
      }
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      /* Le modele suit la souris : tirer a droite tourne le crane a droite,
         donc la camera orbite a GAUCHE et le lacet decroit. */
      self.cam.yaw -= dx * 0.008;
      self.cam.pitch = Math.max(-1.45, Math.min(1.45, self.cam.pitch + dy * 0.008));
      drag.x = e.clientX; drag.y = e.clientY;
      self.goal = null; self.dirty = true; self.kick();
    });
    canvas.addEventListener("pointerup", function (e) {
      var click = drag && drag.moved < 6;
      drag = null;
      if (click && self.onPick) { self.onPick(self.pickAt(e)); }
    });
    canvas.addEventListener("pointerleave", function () {
      if (self.onHover) { self.onHover(null); }
    });
    canvas.addEventListener("wheel", function (e) {
      e.preventDefault();
      self.cam.dist = Math.max(0.2, Math.min(4, self.cam.dist * (1 + Math.sign(e.deltaY) * 0.12)));
      self.goal = null; self.dirty = true; self.kick();
    }, { passive: false });

    if (window.ResizeObserver) {
      new ResizeObserver(function () { self.dirty = true; self.kick(); }).observe(this.stage);
    }
    window.addEventListener("resize", function () { self.dirty = true; self.kick(); });
  };

  Scene3D.prototype.matrices = function () {
    var cam = this.cam, cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    var eye = [cam.tx + cam.dist * cp * Math.sin(cam.yaw),
               cam.ty + cam.dist * sp,
               cam.tz + cam.dist * cp * Math.cos(cam.yaw)];
    var view = lookAt(eye, [cam.tx, cam.ty, cam.tz], [0, 1, 0]);
    var proj = perspective(0.85, this.canvas.width / this.canvas.height || 1, 0.02, 12);
    return mul(proj, mul(view, MODEL));
  };

  Scene3D.prototype.sizePick = function (w, h) {
    var gl = this.gl;
    if (w === this.pickW && h === this.pickH) { return; }
    this.pickW = w; this.pickH = h;
    gl.bindTexture(gl.TEXTURE_2D, this.pickTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.pickDepth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.pickTex, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.pickDepth);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  /* Designation par passe d'identifiants : chaque piece est repeinte dans un
     tampon hors ecran avec une couleur qui EST son numero, puis on lit le
     pixel sous le curseur. Plus court et plus sur qu'un lancer de rayon,
     et insensible a la densite du maillage. */
  Scene3D.prototype.pickAt = function (e) {
    var gl = this.gl, canvas = this.canvas;
    var r = canvas.getBoundingClientRect();
    var x = Math.round((e.clientX - r.left) * canvas.width / r.width);
    var y = Math.round((r.bottom - e.clientY) * canvas.height / r.height);
    this.sizePick(canvas.width, canvas.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    gl.useProgram(this.pickProg);
    var mvp = this.matrices();
    gl.uniformMatrix4fv(this.pu.uMVP, false, mvp);
    gl.uniformMatrix4fv(this.pu.uModel, false, MODEL);
    this.parts.forEach(function (p) {
      if (!p.visible || !p.pickable || p.gen <= 0) { return; }
      gl.uniform1f(this.pu.uId, p.id);
      gl.uniform3fv(this.pu.uOffset, p.off);
      gl.bindVertexArray(p.vao);
      gl.drawElements(gl.TRIANGLES, p.count, gl.UNSIGNED_SHORT, 0);
    }, this);
    var px = new Uint8Array(4);
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.dirty = true;
    var hit = this.parts.filter(function (p) { return p.id === px[0]; })[0];
    return hit ? hit.code : null;
  };

  Scene3D.prototype.lights = function () {
    var v = getComputedStyle(this.stage).getPropertyValue("--v3d-sky").trim();
    return v === "dark" ? [[0.22, 0.25, 0.30], [0.05, 0.06, 0.08]]
                        : [[0.62, 0.65, 0.70], [0.26, 0.24, 0.22]];
  };

  Scene3D.prototype.draw = function () {
    var gl = this.gl, canvas = this.canvas;
    var r = this.stage.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    var mvp = this.matrices(), u = this.u, L = this.lights();
    gl.useProgram(this.prog);
    gl.uniform3fv(u.uSky, L[0]); gl.uniform3fv(u.uGround, L[1]);
    gl.uniformMatrix4fv(u.uMVP, false, mvp);
    gl.uniformMatrix4fv(u.uModel, false, MODEL);

    /* opaques d'abord : sinon une piece translucide masque ce qu'elle
       contient au lieu de le laisser voir */
    var order = this.parts.slice().sort(function (a, b) { return b.alpha - a.alpha; });
    order.forEach(function (p) {
      if (!p.visible || p.alpha < 0.004 || p.gen <= 0) { return; }
      gl.uniform3fv(u.uColor, p.color);
      gl.uniform1f(u.uAlpha, p.alpha);
      gl.uniform1f(u.uDim, p.dim);
      gl.uniform3fv(u.uOffset, p.off);
      gl.uniform1f(u.uSweep, p.gen >= 1 ? 9.0 : -0.62 + 1.30 * p.gen);
      gl.bindVertexArray(p.vao);
      gl.drawElements(gl.TRIANGLES, p.count, gl.UNSIGNED_SHORT, 0);
    });

    if (this.marks.length) {
      var buf = new Float32Array(this.marks.length * 7);
      this.marks.forEach(function (m, i) {
        buf[i * 7] = m.p[0]; buf[i * 7 + 1] = m.p[1]; buf[i * 7 + 2] = m.p[2];
        buf[i * 7 + 3] = m.c[0]; buf[i * 7 + 4] = m.c[1]; buf[i * 7 + 5] = m.c[2];
        buf[i * 7 + 6] = m.s;
      });
      gl.useProgram(this.markProg);
      gl.uniformMatrix4fv(this.mu.uMVP, false, mvp);
      gl.uniformMatrix4fv(this.mu.uModel, false, MODEL);
      gl.uniform1f(this.mu.uAspect, w / h);
      gl.uniform1f(this.mu.uFade, 1.0);
      /* L'agent marche DANS le volume : le test de profondeur le cacherait
         derriere l'os, ce qui supprime tout l'interet. Les marqueurs se
         peignent par-dessus, en dernier. */
      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(false);
      gl.bindVertexArray(this.markVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.markBuf);
      gl.bufferData(gl.ARRAY_BUFFER, buf, gl.DYNAMIC_DRAW);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.marks.length);
      gl.depthMask(true);
      gl.enable(gl.DEPTH_TEST);
    }
    gl.bindVertexArray(null);
    if (this.onOverlay) { this.onOverlay(); }
  };

  /* Le medaillon : une seconde passe dans un coin de la meme toile, depuis
     la camera de la piece visee. C'est le rendu 224x224 d'ALI_IOS, avec sa
     vraie texture — les normales, pas une couleur. */
  Scene3D.prototype.drawInset = function (box, eye, target, only) {
    var gl = this.gl, w = this.canvas.width, h = this.canvas.height;
    var x = Math.round(box.x * w), y = Math.round(box.y * h);
    var sw = Math.round(box.w * w), sh = Math.round(box.h * h);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(x, y, sw, sh);
    gl.viewport(x, y, sw, sh);
    gl.clearColor(0.06, 0.07, 0.09, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.BLEND);

    /* fov 90, znear 0.01, zfar 10 : FoVPerspectiveCameras de render.py */
    var view = lookAt(eye, target, [0, 1, 0]);
    var proj = perspective(Math.PI / 2, 1.0, 0.01, 10);
    var mvp = mul(proj, mul(view, MODEL));
    gl.useProgram(this.normProg);
    gl.uniformMatrix4fv(this.nu.uMVP, false, mvp);
    gl.uniformMatrix4fv(this.nu.uModel, false, MODEL);
    this.parts.forEach(function (p) {
      if (!p.visible) { return; }
      gl.uniform3fv(this.nu.uOffset, p.off);
      /* Le reseau ne voit pas que la dent visee : il voit tout ce que la
         camera attrape. On assombrit le reste au lieu de le cacher. */
      gl.uniform1f(this.nu.uDim, (!only || p.code === only) ? 1.0 : 0.30);
      gl.bindVertexArray(p.vao);
      gl.drawElements(gl.TRIANGLES, p.count, gl.UNSIGNED_SHORT, 0);
    }, this);
    gl.bindVertexArray(null);
    gl.disable(gl.SCISSOR_TEST);
    gl.enable(gl.BLEND);
    gl.viewport(0, 0, w, h);
  };

  Scene3D.prototype.kick = function () {
    if (this.running) { return; }
    var self = this;
    this.running = true;
    requestAnimationFrame(function step(now) {
      var dt = self.lastT ? (now - self.lastT) : 16.7;
      /* Une horloge qui n'avance pas — onglet suspendu, rendu instrumente —
         ne doit pas figer l'animation : on compte une image nominale. */
      if (!(dt > 0)) { dt = 16.7; }
      if (dt > 64) { dt = 64; }
      self.lastT = now;
      var busy = false;

      if (self.goal) {
        var k = 1 - Math.pow(1 - 0.16, dt / 16.7), done = true;
        ["tx", "ty", "tz", "dist"].forEach(function (f) {
          var d = self.goal[f] - self.cam[f];
          if (Math.abs(d) > 0.0008) { done = false; }
          self.cam[f] += d * k;
        });
        if (done) { self.goal = null; } else { busy = true; }
      }
      if (self.onFrame && self.onFrame(dt)) { busy = true; }
      if (busy) { self.dirty = true; }
      if (self.dirty) { self.draw(); self.dirty = false; }
      if (busy) { requestAnimationFrame(step); }
      else { self.running = false; self.lastT = 0; }
    });
  };

  global.Scene3D = Scene3D;
})(window);
