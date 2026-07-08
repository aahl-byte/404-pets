const enabledEl = document.getElementById('enabled');
const swatchesEl = document.getElementById('swatches');
const yarnEl = document.getElementById('yarn');
const statusEl = document.getElementById('status');

function markActiveSwatch(color) {
  for (const b of swatchesEl.querySelectorAll('.swatch')) {
    b.classList.toggle('active', b.dataset.color === color);
  }
}

chrome.storage.sync.get({ enabled: true, color: 'orange' }, (v) => {
  enabledEl.checked = v.enabled !== false;
  markActiveSwatch(v.color || 'orange');
});

enabledEl.addEventListener('change', () => {
  chrome.storage.sync.set({ enabled: enabledEl.checked });
});

swatchesEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.swatch');
  if (!btn) return;
  markActiveSwatch(btn.dataset.color);
  chrome.storage.sync.set({ color: btn.dataset.color });
});

yarnEl.addEventListener('click', async () => {
  statusEl.textContent = '';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('no tab');
    await chrome.tabs.sendMessage(tab.id, { type: 'p404-spawn-ball' });
    statusEl.textContent = 'Yarn tossed!';
  } catch {
    statusEl.textContent = "Can't play on this page 😿";
  }
  setTimeout(() => { statusEl.textContent = ''; }, 2500);
});
