-- A book's cover picture, as the API re-encoded it: 320 × 480 WebP without metadata
-- (docs/detailed-designs/books/upload-book-cover). It cascades from its book, which cascades from its
-- household, so removing the book or erasing the household removes the picture in the same statement.
CREATE TABLE book_cover (
  book_id TEXT PRIMARY KEY REFERENCES book(id) ON DELETE CASCADE,
  image BYTEA NOT NULL,
  etag TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
