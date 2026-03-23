function getBooks() {
  return JSON.parse(localStorage.getItem("books") || "[]");
}

function saveBooks(books) {
  localStorage.setItem("books", JSON.stringify(books));
}

function addBook(book) {
  const books = getBooks();
  books.push(book);
  saveBooks(books);
}

function findBook(isbn) {
  return getBooks().find(b => b.isbn === isbn);
}

function deleteBook(isbn) {
  let books = getBooks();
  books = books.filter(b => b.isbn !== isbn);
  saveBooks(books);
}

// ★追加：貸出
function loanBook(isbn, user) {
  const books = getBooks();
  const book = books.find(b => b.isbn === isbn);

  if (book) {
    book.loan = {
      user: user,
      date: new Date().toLocaleDateString()
    };
    saveBooks(books);
  }
}

// ★追加：返却
function returnBook(isbn) {
  const books = getBooks();
  const book = books.find(b => b.isbn === isbn);

  if (book) {
    delete book.loan;
    saveBooks(books);
  }
}