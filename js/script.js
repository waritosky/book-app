// ===== 要素取得 =====
const video = document.getElementById("camera");
const resultEl = document.getElementById("result");
const searchBtn = document.getElementById("searchBtn");
const saveBtn = document.getElementById("saveBtn");

let currentCode = null;

// ===== カメラ起動 =====
navigator.mediaDevices.getUserMedia({
  video: { facingMode: "environment" }
}).then(stream => {
  video.srcObject = stream;
}).catch(err => {
  alert("カメラ起動に失敗しました: " + err);
});

// ===== 書籍情報取得（OpenBD）=====
async function fetchBook(isbn) {
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
  } catch (e) {
    console.error(e);
    return null;
  }
}

// ===== バーコード検出 =====
if ('BarcodeDetector' in window) {
  const detector = new BarcodeDetector({
    formats: ['ean_13', 'ean_8']
  });

  setInterval(async () => {
    try {
      const barcodes = await detector.detect(video);

      if (barcodes.length > 0) {
        const code = barcodes[0].rawValue;

        // 同じコードの連続検出を防ぐ
        if (code !== currentCode) {
          currentCode = code;
          resultEl.textContent = currentCode;

          searchBtn.style.display = "inline";
          saveBtn.style.display = "inline";
        }
      }
    } catch (e) {
      console.error("バーコード検出エラー", e);
    }
  }, 1000);

} else {
  alert("このブラウザはバーコード検出に未対応です（Chrome推奨）");
}

// ===== 登録処理 =====
saveBtn.onclick = async () => {
  if (!currentCode) return;

  let books = JSON.parse(localStorage.getItem("books") || "[]");

  // 重複チェック
  if (books.find(b => b.isbn === currentCode)) {
    alert("すでに登録済みです");
    return;
  }

  // 書籍情報取得
  const book = await fetchBook(currentCode);

  if (!book) {
    alert("書籍情報が取得できませんでした");
    return;
  }

  // 保存
  const newBook = {
    isbn: currentCode,
    title: book.title,
    author: book.author,
    createdAt: new Date().toISOString()
  };

  books.push(newBook);
  localStorage.setItem("books", JSON.stringify(books));

  alert(`登録しました\n${book.title}`);
};

// ===== 検索処理 =====
searchBtn.onclick = () => {
  if (!currentCode) return;

  let books = JSON.parse(localStorage.getItem("books") || "[]");

  const found = books.find(b => b.isbn === currentCode);

  if (found) {
    alert(`登録済みです\n${found.title}`);
  } else {
    alert("未登録です");
  }
};