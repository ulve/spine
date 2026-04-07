/*
  Warnings:

  - You are about to alter the column `seriesNumber` on the `Book` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Book" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "addedDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "coverPath" TEXT,
    "description" TEXT,
    "goodreadsLink" TEXT,
    "seriesId" TEXT,
    "seriesNumber" REAL,
    CONSTRAINT "Book_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Book" ("addedDate", "coverPath", "description", "filePath", "format", "goodreadsLink", "id", "seriesId", "seriesNumber", "title") SELECT "addedDate", "coverPath", "description", "filePath", "format", "goodreadsLink", "id", "seriesId", "seriesNumber", "title" FROM "Book";
DROP TABLE "Book";
ALTER TABLE "new_Book" RENAME TO "Book";
CREATE UNIQUE INDEX "Book_filePath_key" ON "Book"("filePath");
CREATE INDEX "Book_title_idx" ON "Book"("title");
CREATE INDEX "Book_seriesId_idx" ON "Book"("seriesId");
CREATE INDEX "Book_addedDate_idx" ON "Book"("addedDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
