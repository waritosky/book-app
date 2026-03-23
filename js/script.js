const video = document.getElementById("camera");
const resultEl = document.getElementById("result");
const infoEl = document.getElementById("bookInfo");
const searchBtn = document.getElementById("searchBtn");
const saveBtn = document.getElementById("saveBtn");

let currentCode = null;

// カメラ
navigator.mediaDevices.getUserMedia({
  video: { facingMode: "environment" }
}).then(stream => {
  video.srcObject = stream;
});

// バーコード
if ('BarcodeDetector' in window) {
  const detector = new BarcodeDetector({
    formats: ['ean_13']
  });

  setInterval(async () => {
    const barcodes = await detector.detect(video);

    if (barcodes.length > 0) {
      const code = barcodes[0].rawValue;

      if (code !== currentCode) {
        currentCode = code;
        resultEl.textContent = code;

        searchBtn.style.display = "inline";
        saveBtn.style.display = "inline";

        infoEl.textContent = "";
      }
    }
  }, 1000);
}

// 検索
searchBtn.onclick = () => {
  const book = findBook(currentCode);

  if (book) {
    alert(`登録済み\n${book.title}`);
  } else {
    alert("未登録");
  }
};

// 登録
saveBtn.onclick = async () => {
  if (!isBookISBN(currentCode)) {
    alert("書籍ではありません");
    return;
  }

  if (findBook(currentCode)) {
    alert("登録済み");
    return;
  }

  const book = await fetchBook(currentCode);

  if (!book) {
    alert("取得失敗");
    return;
  }

  addBook({
    isbn: currentCode,
    title: book.title,
    author: book.author,
    createdAt: new Date().toISOString()
  });

  infoEl.textContent = `${book.title} / ${book.author}`;
  alert("登録しました");
};