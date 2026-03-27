function isBookISBN(code) {
  return code.startsWith("978") || code.startsWith("979");
}

function toHttps(url) {
  if (!url) return "";
  return url.replace(/^http:\/\//i, "https://");
}

function pickGoogleThumbnail(imageLinks = {}) {
  return toHttps(
    imageLinks.thumbnail ||
    imageLinks.smallThumbnail ||
    imageLinks.small ||
    imageLinks.medium ||
    imageLinks.large ||
    imageLinks.extraLarge ||
    ""
  );
}

function normalizeAuthor(author) {
  if (!author) return "著者不明";

  let text = String(author).trim();

  // 全角カンマを半角カンマに寄せる
  text = text.replace(/，/g, ",");

  // 「姓,名」のような1人の日本語名っぽい形式なら結合する
  // 例: 井上,雄彦 → 井上雄彦
  if (/^[\u3040-\u30FF\u3400-\u9FFF々ー]+,[\u3040-\u30FF\u3400-\u9FFF々ー]+$/.test(text)) {
    return text.replace(",", "");
  }

  // カンマ区切りの複数著者は「, 」で見やすく整える
  const parts = text.split(",").map(part => part.trim()).filter(Boolean);

  if (parts.length <= 1) {
    return text;
  }

  // 2要素以上ある場合:
  // すべて日本語っぽく、かつ2要素だけなら
  // 「姓」「名」の1人名である可能性が高いので結合
  if (
    parts.length === 2 &&
    parts.every(part => /^[\u3040-\u30FF\u3400-\u9FFF々ー]+$/.test(part))
  ) {
    return parts.join("");
  }

  // それ以外は複数著者として扱う
  return parts.join(", ");
}

async function fetchFromOpenBD(isbn) {
  try {
    const res = await fetch(`https://api.openbd.jp/v1/get?isbn=${isbn}`);
    const data = await res.json();

    if (data[0]) {
      const summary = data[0].summary || {};
      const onix = data[0].onix || {};

      let thumbnail = "";

      if (summary.cover) {
        thumbnail = summary.cover;
      } else if (
        onix.DescriptiveDetail &&
        Array.isArray(onix.DescriptiveDetail.SupportingResource)
      ) {
        const resources = onix.DescriptiveDetail.SupportingResource;

        const imageResource = resources.find(resource => {
          const contentType = resource.ResourceContentType;
          return contentType === "01" || contentType === "03";
        });

        if (
          imageResource &&
          Array.isArray(imageResource.ResourceVersion) &&
          imageResource.ResourceVersion.length > 0
        ) {
          thumbnail =
            imageResource.ResourceVersion[0].ResourceLink || "";
        }
      }

      return {
        title: summary.title || "タイトル不明",
        author: normalizeAuthor(summary.author),
        thumbnail: toHttps(thumbnail)
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

      const thumbnail =
        imageLinks.thumbnail ||
        imageLinks.smallThumbnail ||
        imageLinks.small ||
        imageLinks.medium ||
        imageLinks.large ||
        "";

        return {
          title: info.title || "タイトル不明",
          author: info.authors ? normalizeAuthor(info.authors.join(", ")) : "著者不明",
          thumbnail: thumbnail
            ? thumbnail.replace(/^http:\/\//i, "https://").replace("zoom=1", "zoom=2")
            : ""
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
