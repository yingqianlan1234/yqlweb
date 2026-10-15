/* Hyalite 的折射只作用于面板背后，文字与控件不参与变形。 */
(() => {
  if (!window.Hyalite) return;
  const panels = [...document.querySelectorAll('.topbar,main,.quote-widget,#settings-dialog')];
  const attached = new Set();
  const reducedTransparency = matchMedia('(prefers-reduced-transparency: reduce)');
  let previousBlur = null;
  let frame = 0;
  function sync() {
    frame = 0;
    const blur = Number(document.querySelector('#setting-glass-blur').value);
    const hasBackground = document.body.classList.contains('has-background');
    const enabled = hasBackground && !reducedTransparency.matches;
    const opts = { bevel: 22, thickness: 32, slope: .9, shape: 'squircle', blur, dispersion: 0, shade: .12, rim: .5, edgeW: 5, edge: .18, sat: 1, settle: 100, materialize: 0 };
    for (const panel of panels) {
      const visible = enabled && (panel.tagName !== 'DIALOG' || panel.open);
      panel.classList.toggle('liquid-glass', visible);
      if (visible && !attached.has(panel)) { Hyalite.attach(panel, opts); attached.add(panel); }
      else if (!visible && attached.has(panel)) { Hyalite.detach(panel); attached.delete(panel); }
    }
    if (previousBlur !== blur && attached.size) Hyalite.setOpts({ blur });
    previousBlur = blur;
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(sync); }
  document.addEventListener('appearancechange', schedule);
  new MutationObserver(schedule).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(schedule).observe(document.querySelector('#settings-dialog'), { attributes: true, attributeFilter: ['open'] });
  reducedTransparency.addEventListener('change', schedule);
  sync();
})();
