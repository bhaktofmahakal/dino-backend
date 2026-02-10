#!/bin/bash

echo "🚀 Wallet Service Setup Script"
echo "================================"
echo ""

check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install it first."
        exit 1
    fi
}

echo "📋 Checking prerequisites..."
check_command docker
check_command docker-compose
echo "✅ All prerequisites met"
echo ""

echo "🔧 Starting services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

echo ""
echo "🏥 Checking health..."
health_check=$(curl -s http://localhost:8080/v1/health | grep -o '"status":"healthy"')

if [ -n "$health_check" ]; then
    echo "✅ Service is healthy!"
else
    echo "⚠️  Service may not be fully ready yet. Check logs with: docker-compose logs -f"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "📍 API Server:    http://localhost:8080"
echo "🏥 Health Check:  http://localhost:8080/v1/health"
echo "📊 Database:      localhost:5432 (wallet_db / postgres)"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📚 Quick Start Commands:"
echo "  View logs:         docker-compose logs -f"
echo "  Stop services:     docker-compose down"
echo "  Reset database:    make db-reset"
echo "  Run tests:         See api-examples.http or TESTING.md"
echo ""
echo "👤 Test Users:"
echo "  User 1: c0000001-0000-0000-0000-000000000001"
echo "  User 2: c0000002-0000-0000-0000-000000000002"
echo ""
echo "💡 Try this:"
echo "  curl http://localhost:8080/v1/accounts/c0000001-0000-0000-0000-000000000001/balances"
echo ""
