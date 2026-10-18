/* aurora.js — soft pastel aurora behind the auth card, drawn with WebGPU.
   Product UI, not mock chrome: the real app ships the same effect.
   - Uses the cover-colour tokens so it follows the theme.
   - Falls back to a CSS gradient (.aurora--css) without WebGPU.
   - Does nothing but the static gradient under prefers-reduced-motion. */
(async function () {
  var canvas = document.querySelector('canvas.aurora');
  if (!canvas) return;
  var root = document.documentElement;
  var fallback = function () { canvas.classList.add('aurora--css'); };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !navigator.gpu) return fallback();

  var adapter, device;
  try {
    adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return fallback();
    device = await adapter.requestDevice();
  } catch (e) { return fallback(); }

  var ctx = canvas.getContext('webgpu');
  var format = navigator.gpu.getPreferredCanvasFormat();
  ctx.configure({ device: device, format: format, alphaMode: 'premultiplied' });

  var TOKENS = ['--color-cover-rose', '--color-cover-sky', '--color-cover-sun', '--color-cover-mint', '--color-cover-lilac'];
  function probe(name) {
    var el = document.createElement('i');
    el.style.color = 'var(' + name + ')';
    document.body.appendChild(el);
    var rgb = (getComputedStyle(el).color.match(/[\d.]+/g) || ['0', '0', '0']).slice(0, 3).map(function (v) { return Number(v) / 255; });
    el.remove();
    return rgb;
  }

  var shader = device.createShaderModule({ code: `
struct U { t: f32, aspect: f32, strength: f32, pad: f32, c: array<vec4f, 5> };
@group(0) @binding(0) var<uniform> u: U;
struct VO { @builtin(position) p: vec4f, @location(0) uv: vec2f };
@vertex fn vs(@builtin(vertex_index) i: u32) -> VO {
  var pos = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var o: VO; o.p = vec4f(pos[i], 0.0, 1.0); o.uv = pos[i] * 0.5 + 0.5; return o;
}
@fragment fn fs(in: VO) -> @location(0) vec4f {
  var uv = in.uv; uv.x = uv.x * u.aspect;
  var col = vec3f(0.0); var a = 0.0;
  for (var k = 0u; k < 5u; k++) {
    let f = f32(k);
    let c = vec2f(0.5 * u.aspect + 0.45 * u.aspect * sin(u.t * 0.11 + f * 1.7), 0.5 + 0.42 * cos(u.t * 0.08 + f * 2.3));
    let w = smoothstep(0.62, 0.0, distance(uv, c));
    col = col + u.c[k].rgb * w; a = a + w;
  }
  let alpha = clamp(a, 0.0, 1.0) * u.strength;
  let rgb = select(vec3f(0.0), col / max(a, 0.0001), a > 0.0);
  return vec4f(rgb * alpha, alpha);
}` });

  var pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: shader, entryPoint: 'vs' },
    fragment: { module: shader, entryPoint: 'fs', targets: [{ format: format, blend: { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' } } }] },
    primitive: { topology: 'triangle-list' }
  });
  var uniform = device.createBuffer({ size: 96, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  var bind = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: uniform } }] });
  var data = new Float32Array(24);

  var colours = TOKENS.map(probe);
  new MutationObserver(function () { colours = TOKENS.map(probe); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr * 0.5));
    canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr * 0.5));
  }
  resize();
  window.addEventListener('resize', resize);

  var start = performance.now();
  function frame(now) {
    if (!document.hidden) {
      var dark = root.dataset.theme === 'dark';
      data[0] = (now - start) / 1000; data[1] = canvas.width / canvas.height; data[2] = dark ? 0.32 : 0.55; data[3] = 0;
      for (var k = 0; k < 5; k++) { data[4 + k * 4] = colours[k][0]; data[5 + k * 4] = colours[k][1]; data[6 + k * 4] = colours[k][2]; data[7 + k * 4] = 1; }
      device.queue.writeBuffer(uniform, 0, data);
      var enc = device.createCommandEncoder();
      var pass = enc.beginRenderPass({ colorAttachments: [{ view: ctx.getCurrentTexture().createView(), clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }] });
      pass.setPipeline(pipeline); pass.setBindGroup(0, bind); pass.draw(3); pass.end();
      device.queue.submit([enc.finish()]);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
