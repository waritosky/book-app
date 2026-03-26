const video = document.getElementById("camera");
const resultEl = document.getElementById("result");
const infoEl = document.getElementById("bookInfo");
const statusEl = document.getElementById("bookStatus");
const saveBtn = document.getElementById("saveBtn");
const continuousBtn = document.getElementById("continuousBtn");
const endContinuousBtn = document.getElementById("endContinuousBtn");
const modeBanner = document.getElementById("modeBanner");

const previewCard = document.getElementById("previewCard");
const previewImage = document.getElementById("previewImage");
const previewTitle = document.getElementById("previewTitle");
const previewAuthor = document.getElementById("previewAuthor");
const previewIsbn = document.getElementById("previewIsbn");

let currentCode = null;
let currentBookData = null;
let lastVibratedCode = null;
let isProcessingScan = false;

let noDetectionCount = 0;
const RESET_THRESHOLD = 3; // 約2.4秒（800ms × 3）

let isContinuousMode = false;

// ===== カメラ起動 =====
navigator.mediaDevices.getUserMedia({
  video: { facingMode: "environment" }
}).then(stream => {
  video.srcObject = stream;
}).catch(err => {
  alert("カメラ起動に失敗しました: " + err.message);
});

// ===== バイブ通知 =====
function notifyScanSuccess(code) {
  if (lastVibratedCode === code) return;

  lastVibratedCode = code;

  if (navigator.vibrate) {
    navigator.vibrate(120);
  }
}

// ===== 画像なし用SVG =====
function getFallbackImage() {
  return (
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="120" height="160">
        <rect width="100%" height="100%" fill="#e5e7eb"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
          font-size="14" fill="#6b7280">NO IMAGE</text>
      </svg>
    `)
  );
}

// ===== プレビュー非表示 =====
function hidePreviewCard() {
  previewCard.style.display = "none";
  previewImage.src = "";
  previewImage.alt = "書影";
  previewTitle.textContent = "";
  previewAuthor.textContent = "";
  previewIsbn.textContent = "";
}

// ===== プレビュー表示 =====
function showPreviewCard(book, isbn) {
  previewTitle.textContent = book?.title || "タイトル不明";
  previewAuthor.textContent = book?.author || "著者不明";
  previewIsbn.textContent = `ISBN: ${isbn}`;

  if (book?.thumbnail) {
    previewImage.src = book.thumbnail;
    previewImage.alt = `${book.title || "書籍"} の表紙`;
  } else {
    previewImage.src = getFallbackImage();
    previewImage.alt = "表紙画像なし";
  }

  previewCard.style.display = "flex";
}

// ===== モード表示更新 =====
function updateModeUI() {
  if (isContinuousMode) {
    modeBanner.textContent = "連続登録モード";
    modeBanner.className = "mode-banner continuous-mode";
    continuousBtn.style.display = "none";
    endContinuousBtn.style.display = "inline-block";
  } else {
    modeBanner.textContent = "通常モード";
    modeBanner.className = "mode-banner";
    continuousBtn.style.display = "inline-block";
    endContinuousBtn.style.display = "none";
  }
}

// ===== リセット =====
function resetScanDisplay() {
  currentCode = null;
  currentBookData = null;

  resultEl.textContent = "なし";
  infoEl.textContent = "";
  statusEl.textContent = "";
  statusEl.className = "book-info";

  saveBtn.style.display = "none";
  saveBtn.disabled = true;
  saveBtn.textContent = "登録";

  hidePreviewCard();
}

// ===== 状態表示 =====
function showBookStatus(foundBook) {
  if (foundBook) {
    statusEl.textContent = "登録済み";
    statusEl.className = "book-info registered";

    saveBtn.disabled = true;
    saveBtn.style.display = isContinuousMode ? "none" : "inline-block";
    saveBtn.textContent = "登録済み";
  } else {
    statusEl.textContent = "未登録";
    statusEl.className = "book-info unregistered";

    saveBtn.disabled = false;
    saveBtn.style.display = isContinuousMode ? "none" : "inline-block";
    saveBtn.textContent = "登録";
  }
}

// ===== 連続登録モード用状態表示 =====
function showContinuousRegisteredStatus() {
  statusEl.textContent = "登録しました";
  statusEl.className = "book-info registered";

  saveBtn.disabled = true;
  saveBtn.style.display = "none";
  saveBtn.textContent = "登録済み";
}

function showContinuousAlreadyRegisteredStatus() {
  statusEl.textContent = "登録済み";
  statusEl.className = "book-info registered";

  saveBtn.disabled = true;
  saveBtn.style.display = "none";
  saveBtn.textContent = "登録済み";
}

// ===== 自動登録 =====
function autoRegisterCurrentBook() {
  if (!currentCode) return false;

  if (findBook(currentCode)) {
    showContinuousAlreadyRegisteredStatus();
    return false;
  }

  const title = currentBookData?.title || "タイトル不明";
  const author = currentBookData?.author || "著者不明";
  const thumbnail = currentBookData?.thumbnail || "";

  const bookToSave = {
    isbn: currentCode,
    title,
    author,
    thumbnail,
    createdAt: new Date().toISOString()
  };

  addBook(bookToSave);
  currentBookData = bookToSave;

  infoEl.textContent = `${title} / ${author}`;
  showPreviewCard(bookToSave, currentCode);
  showContinuousRegisteredStatus();

  return true;
}

// ===== スキャン処理 =====
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
  saveBtn.style.display = isContinuousMode ? "none" : "inline-block";
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

      if (isContinuousMode) {
        showContinuousAlreadyRegisteredStatus();
      } else {
        showBookStatus(found);
      }
      return;
    }

    const book = await fetchBook(code);

    if (book) {
      currentBookData = book;
      infoEl.textContent = `${book.title} / ${book.author}`;
      showPreviewCard(book, code);

      if (isContinuousMode) {
        autoRegisterCurrentBook();
      } else {
        showBookStatus(null);
      }
    } else {
      currentBookData = {
        title: "タイトル不明",
        author: "著者不明",
        thumbnail: ""
      };

      infoEl.textContent = "書籍情報が取得できませんでした";
      showPreviewCard(currentBookData, code);

      if (isContinuousMode) {
        autoRegisterCurrentBook();
      } else {
        showBookStatus(null);
      }
    }
  } catch (e) {
    console.error("書籍情報取得エラー", e);
    resetScanDisplay();
  } finally {
    isProcessingScan = false;
  }
}

// ===== バーコード検出 =====
if ("BarcodeDetector" in window) {
  const detector = new BarcodeDetector({
    formats: ["ean_13", "ean_8"]
  });

  setInterval(async () => {
    try {
      const barcodes = await detector.detect(video);

      if (!barcodes.length) {
        noDetectionCount++;

        if (noDetectionCount >= RESET_THRESHOLD) {
          resetScanDisplay();
        }
        return;
      }

      noDetectionCount = 0;

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

// ===== 手動登録 =====
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
    saveBtn.style.display = isContinuousMode ? "none" : "inline-block";
    saveBtn.textContent = "登録済み";
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
  saveBtn.style.display = isContinuousMode ? "none" : "inline-block";
  saveBtn.textContent = "登録済み";

  showPreviewCard(bookToSave, currentCode);
};

// ===== 連続登録モード開始 =====
continuousBtn.onclick = () => {
  isContinuousMode = true;
  updateModeUI();
  resetScanDisplay();
};

// ===== 連続登録モード終了 =====
endContinuousBtn.onclick = () => {
  isContinuousMode = false;
  updateModeUI();
  resetScanDisplay();
};

// ===== 初期化 =====
updateModeUI();
resetScanDisplay();
