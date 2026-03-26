function isBookISBN(code) {
  return code.startsWith("978") || code.startsWith("979");
}

async function fetchFromOpenBD(isbn) {
  try {
    const res = await fetch(`https://api.openbd.jp/v1/get?isbn=${isbn}`);
    const data = await res.json();

    if (data[0]) {
      const summary = data[0].summary || {};

      return {
        title: summary.title || "タイトル不明",
        author: summary.author || "著者不明",
        thumbnail: summary.cover || ""
      };
    }

    return null;
  } catch (e) {
    console.error("OpenBDエラー", e);
    return null;
  }
}

async function fetchFromGoogleBooks(isbn) {
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
    const data = await res.json();

    if (data.totalItems > 0) {
      const info = data.items[0].volumeInfo || {};
      const imageLinks = info.imageLinks || {};

      return {
        title: info.title || "タイトル不明",
        author: info.authors ? info.authors.join(", ") : "著者不明",
        thumbnail: imageLinks.thumbnail || imageLinks.smallThumbnail || ""
      };
    }

    return null;
  } catch (e) {
    console.error("Google Booksエラー", e);
    return null;
  }
}

async function fetchBook(isbn) {
  let book = await fetchFromOpenBD(isbn);
  if (book) return book;

  book = await fetchFromGoogleBooks(isbn);
  if (book) return book;

  return null;
}
