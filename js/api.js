function isBookISBN(code) {
  return code.startsWith("978") || code.startsWith("979");
}

async function fetchFromOpenBD(isbn) {
  try {
    const res = await fetch(`https://api.openbd.jp/v1/get?isbn=${isbn}`);
    const data = await res.json();
    if (data[0]) {
      return {
        title: data[0].summary.title,
        author: data[0].summary.author
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchFromGoogleBooks(isbn) {
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
    const data = await res.json();
    if (data.totalItems > 0) {
      const info = data.items[0].volumeInfo;
      return {
        title: info.title || "タイトル不明",
        author: info.authors ? info.authors.join(", ") : "著者不明"
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchBook(isbn) {
  let book = await fetchFromOpenBD(isbn);
  if (book) return book;

  return await fetchFromGoogleBooks(isbn);
}