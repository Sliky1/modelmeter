(function () {
  function css(name, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  }
  function getCtx(el) { return el && el.getContext ? el.getContext('2d') : null; }
  function clear(ctx, w, h) { ctx.clearRect(0, 0, w, h); }
  function fit(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    return { width, height, dpr };
  }
  function ChartLite(canvas, config) {
    this.canvas = canvas;
    this.ctx = getCtx(canvas);
    this.type = config.type;
    this.data = config.data || { labels: [], datasets: [] };
    this.options = config.options || {};
    this.update();
  }
  ChartLite.prototype.update = function () {
    if (!this.ctx) { return; }
    const ctx = this.ctx;
    const size = fit(this.canvas);
    const w = size.width, h = size.height;
    clear(ctx, w, h);
    const fg = css('--vscode-foreground', '#cccccc');
    const grid = css('--vscode-widget-border', '#555555');
    ctx.font = Math.max(10, 10 * size.dpr) + 'px sans-serif';
    ctx.lineWidth = Math.max(1, size.dpr);
    ctx.strokeStyle = grid;
    ctx.fillStyle = fg;
    const padL = 30 * size.dpr, padR = 8 * size.dpr, padT = 12 * size.dpr, padB = 22 * size.dpr;
    const plotW = Math.max(1, w - padL - padR);
    const plotH = Math.max(1, h - padT - padB);
    ctx.beginPath();
    ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH); ctx.lineTo(padL + plotW, padT + plotH); ctx.stroke();
    const labels = this.data.labels || [];
    const datasets = this.data.datasets || [];
    if (!labels.length || !datasets.length) { return; }
    if (this.type === 'line') { drawLine(ctx, this.data, padL, padT, plotW, plotH, size.dpr); }
    else { drawBars(ctx, this.data, padL, padT, plotW, plotH, size.dpr); }
  };
  function maxLine(data) { return Math.max(0.000001, ...((data.datasets[0] && data.datasets[0].data) || [0]).map(Number)); }
  function drawLine(ctx, data, x0, y0, w, h, dpr) {
    const vals = (data.datasets[0].data || []).map(Number);
    const max = maxLine(data);
    const n = Math.max(1, vals.length - 1);
    ctx.strokeStyle = data.datasets[0].borderColor || '#f39c12';
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    vals.forEach(function (v, i) {
      const x = x0 + (w * i / n);
      const y = y0 + h - (h * v / max);
      if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
    });
    ctx.stroke();
  }
  function drawBars(ctx, data, x0, y0, w, h, dpr) {
    const labels = data.labels || [];
    const datasets = data.datasets || [];
    const totals = labels.map(function (_, i) { return datasets.reduce(function (s, ds) { return s + Number((ds.data || [])[i] || 0); }, 0); });
    const max = Math.max(1, ...totals);
    const gap = 3 * dpr;
    const bw = Math.max(2 * dpr, (w / Math.max(1, labels.length)) - gap);
    labels.forEach(function (_, i) {
      let top = y0 + h;
      datasets.forEach(function (ds) {
        const v = Number((ds.data || [])[i] || 0);
        const bh = h * v / max;
        ctx.fillStyle = ds.backgroundColor || ds.borderColor || '#888888';
        ctx.fillRect(x0 + (w * i / labels.length) + gap / 2, top - bh, bw, bh);
        top -= bh;
      });
    });
  }
  window.Chart = ChartLite;
  window.addEventListener('resize', function () {
    document.querySelectorAll('canvas').forEach(function (canvas) {
      if (canvas._chartLite) { canvas._chartLite.update(); }
    });
  });
  const OriginalChart = window.Chart;
  window.Chart = function (canvas, config) {
    const chart = new OriginalChart(canvas, config);
    canvas._chartLite = chart;
    return chart;
  };
})();
