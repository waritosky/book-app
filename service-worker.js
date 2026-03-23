self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("book-app").then(cache =>
      cache.addAll([
        "/",
        "/index.html",
        "/books.html",
        "/css/style.css",
        "/js/script.js",
        "/js/api.js",
        "/js/storage.js"
      ])
    )
  );
});