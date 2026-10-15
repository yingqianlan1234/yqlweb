/* Hyalite 的折射只作用于面板背后，文字与控件不参与变形。 */
(() => {
  if (!window.Hyalite) return;
  const panels = [...document.querySelectorAll('.topbar,main,.quote-widget,#settings-dialog')];
  const attached = new Set();
  const inView = new Set(panels);
  const dialog = document.querySelector('#settings-dialog');
  const reducedTransparency = matchMedia('(prefers-reduced-transparency: reduce)');
  let previousBlur = null;
  let frame = 0;
  let blurTimer = 0;
  function sync() {
    frame = 0;
    const blur = Number(document.querySelector('#setting-glass-blur').value);
    const hasBackground = document.body.classList.contains('has-background');
    const enabled = hasBackground && !reducedTransparency.matches && !document.hidden;
    const focused = document.body.classList.contains('search-focused');
    const opts = { bevel: 22, thickness: 32, slope: .9, shape: 'squircle', blur, dispersion: 0, smooth: 0, shade: .12, rim: .5, edgeW: 5, edge: .18, sat: 1, settle: 100, materialize: 0 };
    for (const panel of panels) {
      const glass = hasBackground && !reducedTransparency.matches && (panel !== dialog || dialog.open);
      const visible = enabled && (panel === dialog ? dialog.open : !dialog.open && !focused && inView.has(panel));
      panel.classList.toggle('liquid-glass', glass);
      if (visible && !attached.has(panel)) { Hyalite.attach(panel, opts); attached.add(panel); }
      if (!visible) {
        if (attached.has(panel)) { Hyalite.detach(panel); attached.delete(panel); }
      }
    }
    if (previousBlur !== blur) {
      clearTimeout(blurTimer);
      // 滑块停止变化后再替换 SVG 图，避免拖动时每帧销毁和重建滤镜。
      if (attached.size) blurTimer = setTimeout(() => Hyalite.setOpts({ blur }), 100);
    }
    previousBlur = blur;
  }
  function schedule() {
    if (document.hidden) { cancelAnimationFrame(frame); sync(); return; }
    if (!frame) frame = requestAnimationFrame(sync);
  }
  document.addEventListener('appearancechange', schedule);
  new MutationObserver(schedule).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(schedule).observe(dialog, { attributes: true, attributeFilter: ['open'] });
  const visibility = new IntersectionObserver(entries => {
    for (const entry of entries) { if (entry.isIntersecting) inView.add(entry.target); else inView.delete(entry.target); }
    schedule();
  });
  panels.forEach(panel => visibility.observe(panel));
  document.addEventListener('visibilitychange', schedule);
  reducedTransparency.addEventListener('change', schedule);
  sync();
})();
