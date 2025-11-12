if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { window.SimPlay && window.SimPlay.init(); });
} else {
  window.SimPlay && window.SimPlay.init();
}
