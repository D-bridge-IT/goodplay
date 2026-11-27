document.documentElement.lang = LANG;
Hub.init();
// Deep link for testing and sharing: index.html#game=<id> opens a game directly.
(function () {
  const m = location.hash.match(/game=([\w-]+)/);
  if (m && window.Games && Games[m[1]]) Hub.openGame(m[1]);
})();
