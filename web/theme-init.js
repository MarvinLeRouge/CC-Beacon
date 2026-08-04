(function () {
  var stored = localStorage.getItem('cc-beacon-theme');
  if (stored) document.documentElement.setAttribute('data-theme', stored);
})();
