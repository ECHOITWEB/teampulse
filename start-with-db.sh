#!/bin/bash

echo "🚀 Starting TeamPulse with MySQL database..."

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker first."
  exit 1
fi

# Start MySQL container
echo "📦 Starting MySQL container..."
docker-compose up -d mysql

# Wait for MySQL to be ready
echo "⏳ Waiting for MySQL to be ready..."
sleep 10

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend && npm install && cd ..

# Start backend server
echo "🖥️  Starting backend server..."
cd backend && npm run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Start frontend
echo "🎨 Starting frontend..."
npm start

# Cleanup on exit
trap "kill $BACKEND_PID; docker-compose down" EXIT