#!/bin/bash

echo "🎨 Installing openclow ULTRA - Gorgeous Edition"
echo "==============================================="

cd ~/openclow || exit

echo "📦 Installing packages..."
npm install react-markdown react-syntax-highlighter
npm install --save-dev @types/react-syntax-highlighter

echo ""

FILE=~/Downloads/openclow-ultra.tsx

if [ ! -f "$FILE" ]; then
    echo "❌ File not found: $FILE"
    echo "Please place openclow-ultra.tsx in ~/Downloads"
    exit 1
fi

echo "🚀 Install Ultra UI? (y/n)"
read -r response

if [[ "$response" =~ ^([yY])$ ]]; then
    cp "$FILE" src/app/page.tsx
    echo "✅ Ultra UI installed!"
    npm run dev
else
    echo "❌ Installation cancelled"
fi
