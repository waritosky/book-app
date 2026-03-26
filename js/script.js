const video = document.getElementById("camera");
const resultEl = document.getElementById("result");
const infoEl = document.getElementById("bookInfo");
const statusEl = document.getElementById("bookStatus");
const saveBtn = document.getElementById("saveBtn");

const previewCard = document.getElementById("previewCard");
const previewImage = document.getElementById("previewImage");
const previewTitle = document.getElementById("previewTitle");
const previewAuthor = document.getElementById("previewAuthor");
const previewIsbn = document.getElementById("previewIsbn");

let currentCode = null;
let currentBookData = null;
let lastVibratedCode = null;
let isProcessingScan = false;

// カメラ起動
navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: "environment"
  }
}).then(stream => {
  video.srcObject = stream;
}).catch(err => {
  alert("カメラ起動に失敗しました: " + err.message);
});

// 読取り成功時の通知
function notifyScanSuccess(code) {
  if (lastVibratedCode === code) return;

  lastVibratedCode = code;

  if (navigator.vibrate) {
    navigator.vibrate(120);
  }
}

// プレビュー非表示
function hidePreviewCard() {
  previewCard.style.display = "none";
  previewImage.src = "";
  previewImage.alt = "書影";
  previewTitle.textContent = "";
  previewAuthor.textContent = "";
  previewIsbn.textContent = "";
}

// プレビュー表示
function showPreviewCard(book, isbn) {
  previewTitle.textContent = book?.title || "タイトル不明";
  previewAuthor.textContent = book?.author || "著者不明";
  previewIsbn.textContent = `ISBN: ${isbn}`;

  if (book?.thumbnail) {
    previewImage.src = book.thumbnail;
    previewImage.alt = `${book.title || "書籍"} の表紙`;
  } else {
    previewImage.src =
      "data:image/svg+xml;utf8," +
      encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="120" height="160">
          <rect width="100%" height="100%" fill="#e5e7eb"/>
          <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
            font-size="14" fill="#6b7280">NO IMAGE</text>
        </svg>
      `);
    previewImage.alt = "表紙画像なし";
  }

  previewCard.style.display = "flex";
}

// 表示初期化
function resetScanDisplay() {
  resultEl.textContent = "なし";
  infoEl.textContent = "";
  statusEl.textContent = "";
  statusEl.className = "book-info";
  saveBtn.style.display = "none";
  saveBtn.disabled = true;
  saveBtn.textContent = "登録";
  currentBookData = null;
  hidePreviewCard();
}

// 状態表示
function showBookStatus(foundBook) {
  if (foundBook) {
    statusEl.textContent = "登録済み";
    statusEl.className = "book-info registered";
    saveBtn.disabled = true;
    saveBtn.style.display = "inline-block";
    saveBtn.textContent = "登録済み";
  } else {
    statusEl.textContent = "未登録";
    statusEl.className = "book-info unregistered";
    saveBtn.disabled = false;
    saveBtn.style.display = "inline-block";
    saveBtn.textContent = "登録";
  }
}

// スキャン後の処理
async function handleDetectedBook(code) {
  if (isProcessingScan) return;
  if (code === currentCode) return;
  if (!isBookISBN(code)) return;

  isProcessingScan = true;
  currentCode = code;
  currentBookData = null;

  resultEl.textContent = code;
  infoEl.textContent = "書籍情報を取得中...";
  statusEl.textContent = "";
  statusEl.className = "book-info";
  saveBtn.style.display = "none";
  saveBtn.disabled = true;
  saveBtn.textContent = "登録";
  hidePreviewCard();

  notifyScanSuccess(code);

  try {
    const found = findBook(code);

    if (found) {
      currentBookData = found;
      infoEl.textContent = `${found.title} / ${found.author}`;
      showPreviewCard(found, code);
      showBookStatus(found);
      return;
    }

    const book = await fetchBook(code);

    if (book) {
      currentBookData = book;
      infoEl.textContent = `${book.title} / ${book.author}`;
      showPreviewCard(book, code);
      showBookStatus(null);
    } else {
      infoEl.textContent = "書籍情報が取得できませんでした";
      statusEl.textContent = "未登録";
      statusEl.className = "book-info unregistered";
      saveBtn.style.display = "inline-block";
      saveBtn.disabled = false;
      saveBtn.textContent = "登録";

      showPreviewCard({
        title: "タイトル不明",
        author: "著者不明",
        thumbnail: ""
      }, code);
    }
  } catch (e) {
    console.error("書籍情報取得エラー", e);
    infoEl.textContent = "書籍情報の取得中にエラーが発生しました";
    statusEl.textContent = "";
    statusEl.className = "book-info";
    saveBtn.style.display = "none";
    saveBtn.disabled = true;
    saveBtn.textContent = "登録";
    hidePreviewCard();
  } finally {
    isProcessingScan = false;
  }
}

// バーコード検出
if ("BarcodeDetector" in window) {
  const detector = new BarcodeDetector({
    formats: ["ean_13", "ean_8"]
  });

  setInterval(async () => {
    try {
      const barcodes = await detector.detect(video);

      if (!barcodes.length) return;

      const bookBarcode = barcodes.find(item => isBookISBN(item.rawValue));
      if (!bookBarcode) return;

      await handleDetectedBook(bookBarcode.rawValue);
    } catch (e) {
      console.error("バーコード検出エラー", e);
    }
  }, 800);
} else {
  alert("このブラウザはバーコード検出に未対応です。Chrome系ブラウザで試してください。");
}

// 登録
saveBtn.onclick = async () => {
  if (!currentCode) return;

  if (!isBookISBN(currentCode)) {
    alert("これは書籍のバーコードではありません");
    return;
  }

  if (findBook(currentCode)) {
    statusEl.textContent = "登録済み";
    statusEl.className = "book-info registered";
    saveBtn.disabled = true;
    saveBtn.style.display = "inline-block";
    saveBtn.textContent = "登録済み";
    alert("すでに登録済みです");
    return;
  }

  let title = currentBookData?.title || "タイトル不明";
  let author = currentBookData?.author || "著者不明";
  let thumbnail = currentBookData?.thumbnail || "";

  if (!currentBookData) {
    const fetchedBook = await fetchBook(currentCode);
    if (fetchedBook) {
      title = fetchedBook.title;
      author = fetchedBook.author;
      thumbnail = fetchedBook.thumbnail || "";
      currentBookData = fetchedBook;
    }
  }

  const bookToSave = {
    isbn: currentCode,
    title,
    author,
    thumbnail,
    createdAt: new Date().toISOString()
  };

  addBook(bookToSave);

  infoEl.textContent = `${title} / ${author}`;
  statusEl.textContent = "登録済み";
  statusEl.className = "book-info registered";
  saveBtn.disabled = true;
  saveBtn.style.display = "inline-block";
  saveBtn.textContent = "登録済み";

  showPreviewCard(bookToSave, currentCode);

  alert(`登録しました\n${title}`);
};

// 初期表示
resetScanDisplay();
