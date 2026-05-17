#!/bin/bash
# ATLAS - Complete Setup Script

echo "======================================"
echo "ATLAS - AI PC Building Platform Setup"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -d "atlas-backend" ] || [ ! -d "client" ]; then
    echo "Error: Please run this script from the ATLAS root directory"
    exit 1
fi

echo "Setting up ATLAS Backend..."
cd atlas-backend

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..."
    python -m venv .venv
fi

# Activate virtual environment
if [ -f ".venv/Scripts/activate" ]; then
    source .venv/Scripts/activate  # Windows Git Bash
elif [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate      # macOS/Linux
fi

# Install backend dependencies
echo "Installing backend dependencies..."
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file from example..."
    cp example.env .env
fi

echo ""
echo "Backend setup complete!"
echo ""
echo "Setup Frontend..."
cd ../client

# Install frontend dependencies
echo "Installing frontend dependencies..."
npm install

echo ""
echo "======================================"
echo "Setup Complete!"
echo "======================================"
echo ""
echo "To start the application:"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd atlas-backend"
echo "  source .venv/Scripts/activate  # or .venv/bin/activate on macOS/Linux"
echo "  python -m uvicorn main:app --reload"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd client"
echo "  npm run dev"
echo ""
echo "Then open: http://localhost:5173"
echo ""
