#!/usr/bin/env bash
set -e

echo "🚀 Starting Database..."
docker compose up -d db

echo "⏳ Waiting for PostgreSQL to be ready..."
until docker compose exec db pg_isready -U noor -d inventory > /dev/null 2>&1; do
  sleep 1
done

echo "✅ Database is ready!"
echo "🌐 Starting FastAPI Web Application on http://localhost:8000 ..."
./venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
