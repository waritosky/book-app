const video = document.getElementById("camera");
const resultEl = document.getElementById("result");
const infoEl = document.getElementById("bookInfo");
const statusEl = document.getElementById("bookStatus");
const saveBtn = document.getElementById("saveBtn");

let currentCode = null;
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

// 表示初期化
function resetScanDisplay() {
  resultEl.textContent = "なし";
  infoEl.textContent = "";
  statusEl.textContent = "";
  saveBtn.style.display = "none";
  saveBtn.disabled = true;
  saveBtn.textContent = "登録";
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

// スキャン後の書籍処理
async function handleDetectedBook(code) {
  if (isProcessingScan) return;
  if (code === currentCode) return;
  if (!isBookISBN(code)) return;

  isProcessingScan = true;
  currentCode = code;

  resultEl.textContent = code;
  infoEl.textContent = "書籍情報を取得中...";
  statusEl.textContent = "";
  saveBtn.style.display = "none";
  saveBtn.disabled = true;
  saveBtn.textContent = "登録";

  notifyScanSuccess(code);

  try {
    const found = findBook(code);

    if (found) {
      infoEl.textContent = `${found.title} / ${found.author}`;
      showBookStatus(found);
      return;
    }

    const book = await fetchBook(code);

    if (book) {
      infoEl.textContent = `${book.title} / ${book.author}`;
      showBookStatus(null);
    } else {
      infoEl.textContent = "書籍情報を取得できませんでした";
      statusEl.textContent = "未登録";
      statusEl.className = "book-info available";
      saveBtn.style.display = "inline-block";
    }
  } catch (e) {
    console.error("書籍情報取得エラー", e);
    infoEl.textContent = "書籍情報の取得中にエラーが発生しました";
    statusEl.textContent = "";
    saveBtn.style.display = "none";
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

      // 書籍JANだけを対象にする
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

  let title = "";
  let author = "";

  const fetchedBook = await fetchBook(currentCode);

  if (fetchedBook) {
    title = fetchedBook.title;
    author = fetchedBook.author;
  } else {
    // 読取り時に取得失敗していても最低限ISBNだけで登録できるようにする
    title = "タイトル不明";
    author = "著者不明";
  }

  addBook({
    isbn: currentCode,
    title: title,
    author: author,
    createdAt: new Date().toISOString()
  });

  infoEl.textContent = `${title} / ${author}`;
  statusEl.textContent = "登録済み";
  statusEl.className = "book-info registered";
  saveBtn.style.display = "none";

  alert(`登録しました\n${title}`);
};

// 初期表示
resetScanDisplay();
