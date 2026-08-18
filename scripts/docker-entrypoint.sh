#!/bin/sh
set -eu

DB_URL="${DATABASE_URL:-file:/app/data/gallery.db?connection_limit=1}"
DB_FILE=$(printf '%s' "$DB_URL" | sed 's/^file://; s/?.*$//')
EMPTY_DB="/app/prisma/gallery.empty.db"

if [ ! -f "$DB_FILE" ]; then
  mkdir -p "$(dirname "$DB_FILE")"
  if [ -f "$EMPTY_DB" ]; then
    cp "$EMPTY_DB" "$DB_FILE"
    echo "entrypoint: copied empty database to $DB_FILE"
  fi
fi

node /app/scripts/migrate-sqlite.mjs
exec node server.js
