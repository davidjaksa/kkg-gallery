#!/usr/bin/env node
/**
 * Idempotent SQLite migrate for nested albums.
 * Safe to run on every container start.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");

function sqlitePathFromUrl(raw) {
  const url = (raw ?? "").trim();
  if (!url) return path.join(ROOT, "data", "gallery.db");
  const withoutQuery = url.split("?")[0];
  const file = withoutQuery.replace(/^file:/, "");
  return path.isAbsolute(file) ? file : path.resolve(ROOT, "prisma", file);
}

function findSqlite3() {
  const candidates = ["sqlite3", "/usr/bin/sqlite3", "/opt/homebrew/bin/sqlite3", "/usr/local/bin/sqlite3"];
  for (const bin of candidates) {
    try {
      execFileSync(bin, ["-version"], { stdio: "ignore" });
      return bin;
    } catch {
      // try next
    }
  }
  throw new Error("sqlite3 CLI not found");
}

function runSql(bin, dbPath, sql) {
  return execFileSync(bin, [dbPath, sql], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  }).trim();
}

function execSql(bin, dbPath, sql) {
  execFileSync(bin, [dbPath, sql], {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    maxBuffer: 10 * 1024 * 1024,
  });
}

const dbPath = sqlitePathFromUrl(process.env.DATABASE_URL);
const emptyDb = path.join(ROOT, "prisma", "gallery.empty.db");

if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  if (fs.existsSync(emptyDb)) {
    fs.copyFileSync(emptyDb, dbPath);
    console.log(`migrate: created ${dbPath} from empty template`);
  } else {
    throw new Error(`Database missing and no template at ${emptyDb}: ${dbPath}`);
  }
}

const sqlite3 = findSqlite3();

function tableExists(name) {
  const out = runSql(
    sqlite3,
    dbPath,
    `SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='${name}';`,
  );
  return Number(out) > 0;
}

function columns(table) {
  const out = runSql(sqlite3, dbPath, `PRAGMA table_info("${table}");`);
  return out
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|");
      return parts[1];
    });
}

function hasColumn(table, column) {
  return columns(table).includes(column);
}

if (!tableExists("Album")) {
  console.log("migrate: Album table missing; skip");
  process.exit(0);
}

const albumCols = columns("Album");
const hasYearTable = tableExists("Year");
const hasYearId = albumCols.includes("yearId");
const hasParentId = albumCols.includes("parentId");
const hasParentKey = albumCols.includes("parentKey");
const hasCoverPath = albumCols.includes("coverPath");

if (hasYearTable && hasYearId) {
  console.log("migrate: converting Year rows into root albums");
  const statements = [];
  if (!hasParentId) statements.push(`ALTER TABLE "Album" ADD COLUMN "parentId" TEXT;`);
  if (!hasParentKey) statements.push(`ALTER TABLE "Album" ADD COLUMN "parentKey" TEXT NOT NULL DEFAULT '';`);
  if (!hasCoverPath) statements.push(`ALTER TABLE "Album" ADD COLUMN "coverPath" TEXT;`);

  execSql(
    sqlite3,
    dbPath,
    `
PRAGMA foreign_keys=OFF;
BEGIN;
${statements.join("\n")}

INSERT INTO "Album" (
  "id", "slug", "title", "description", "eventDate", "published", "sortOrder",
  "createdAt", "updatedAt", "yearId", "createdById", "parentId", "parentKey", "coverPath"
)
SELECT
  y."id",
  y."slug",
  COALESCE(NULLIF(y."label", ''), y."slug"),
  NULL,
  NULL,
  1,
  y."sortOrder",
  y."createdAt",
  y."createdAt",
  y."id",
  COALESCE(
    (SELECT "id" FROM "User" WHERE "role" = 'ADMIN' LIMIT 1),
    (SELECT "id" FROM "User" LIMIT 1)
  ),
  NULL,
  '',
  y."coverPath"
FROM "Year" y
WHERE NOT EXISTS (SELECT 1 FROM "Album" a WHERE a."id" = y."id")
  AND COALESCE(
    (SELECT "id" FROM "User" WHERE "role" = 'ADMIN' LIMIT 1),
    (SELECT "id" FROM "User" LIMIT 1)
  ) IS NOT NULL;

UPDATE "Album"
SET "parentId" = "yearId", "parentKey" = "yearId"
WHERE "yearId" IS NOT NULL
  AND EXISTS (SELECT 1 FROM "Year" y WHERE y."id" = "Album"."yearId")
  AND "id" NOT IN (SELECT "id" FROM "Year");

CREATE TABLE "Album_new" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "eventDate" DATETIME,
  "published" INTEGER NOT NULL DEFAULT 0,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "coverPath" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "parentId" TEXT,
  "parentKey" TEXT NOT NULL DEFAULT '',
  "createdById" TEXT NOT NULL,
  CONSTRAINT "Album_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Album" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Album_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "Album_new" (
  "id", "slug", "title", "description", "eventDate", "published", "sortOrder",
  "coverPath", "createdAt", "updatedAt", "parentId", "parentKey", "createdById"
)
SELECT
  "id", "slug", "title", "description", "eventDate", "published", "sortOrder",
  "coverPath", "createdAt", "updatedAt", "parentId", COALESCE("parentKey", ''), "createdById"
FROM "Album";

DROP TABLE "Album";
ALTER TABLE "Album_new" RENAME TO "Album";
CREATE UNIQUE INDEX "Album_parentKey_slug_key" ON "Album"("parentKey", "slug");
CREATE INDEX "Album_parentId_idx" ON "Album"("parentId");

DROP TABLE IF EXISTS "Year";
COMMIT;
PRAGMA foreign_keys=ON;
`,
  );
  console.log("migrate: Year → nested Album complete");
} else if (hasYearId && !hasYearTable) {
  console.log("migrate: yearId present without Year table; rebuilding Album");
  execSql(
    sqlite3,
    dbPath,
    `
PRAGMA foreign_keys=OFF;
BEGIN;
${hasParentId ? "" : `ALTER TABLE "Album" ADD COLUMN "parentId" TEXT;`}
${hasParentKey ? "" : `ALTER TABLE "Album" ADD COLUMN "parentKey" TEXT NOT NULL DEFAULT '';`}
${hasCoverPath ? "" : `ALTER TABLE "Album" ADD COLUMN "coverPath" TEXT;`}
CREATE TABLE "Album_new" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "eventDate" DATETIME,
  "published" INTEGER NOT NULL DEFAULT 0,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "coverPath" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "parentId" TEXT,
  "parentKey" TEXT NOT NULL DEFAULT '',
  "createdById" TEXT NOT NULL,
  CONSTRAINT "Album_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Album" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Album_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "Album_new" (
  "id", "slug", "title", "description", "eventDate", "published", "sortOrder",
  "coverPath", "createdAt", "updatedAt", "parentId", "parentKey", "createdById"
)
SELECT
  "id", "slug", "title", "description", "eventDate", "published", "sortOrder",
  "coverPath", "createdAt", "updatedAt", "parentId", COALESCE("parentKey", ''), "createdById"
FROM "Album";
DROP TABLE "Album";
ALTER TABLE "Album_new" RENAME TO "Album";
CREATE UNIQUE INDEX IF NOT EXISTS "Album_parentKey_slug_key" ON "Album"("parentKey", "slug");
CREATE INDEX IF NOT EXISTS "Album_parentId_idx" ON "Album"("parentId");
COMMIT;
PRAGMA foreign_keys=ON;
`,
  );
} else {
  if (!hasParentId) execSql(sqlite3, dbPath, `ALTER TABLE "Album" ADD COLUMN "parentId" TEXT;`);
  if (!hasParentKey) execSql(sqlite3, dbPath, `ALTER TABLE "Album" ADD COLUMN "parentKey" TEXT NOT NULL DEFAULT '';`);
  if (!hasCoverPath) execSql(sqlite3, dbPath, `ALTER TABLE "Album" ADD COLUMN "coverPath" TEXT;`);
  console.log("migrate: Album already nested");
}

if (!tableExists("Setting")) {
  execSql(
    sqlite3,
    dbPath,
    `
CREATE TABLE "Setting" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "value" TEXT NOT NULL
);
INSERT INTO "Setting" ("key", "value") VALUES ('homepageAlbumCount', '3');
`,
  );
  console.log("migrate: created Setting table");
} else {
  const exists = runSql(
    sqlite3,
    dbPath,
    `SELECT COUNT(*) FROM "Setting" WHERE "key" = 'homepageAlbumCount';`,
  );
  if (Number(exists) === 0) {
    execSql(sqlite3, dbPath, `INSERT INTO "Setting" ("key", "value") VALUES ('homepageAlbumCount', '3');`);
  }
}

console.log("migrate: done");
