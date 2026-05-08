#!/bin/bash

echo "🔑 openclow API Key Configuration"
echo "=================================="
echo ""

# Check if running interactively
if [ -t 0 ]; then
    read -sp "Enter your Google Gemini API key: " API_KEY
    echo ""
else
    echo "Error: Please run this script in an interactive terminal"
    exit 1
fi

# Validate input
if [ -z "$API_KEY" ]; then
    echo "❌ Error: API key cannot be empty"
    exit 1
fi

# Create a temporary HTML file to set localStorage
cat > /tmp/set-api-key.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>openclow - Set API Key</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #f0f0f0; }
        .container { max-width: 500px; margin: 50px auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        .success { color: green; font-size: 18px; margin: 20px 0; }
        .info { color: #666; background: #f9f9f9; padding: 10px; border-radius: 4px; margin: 10px 0; }
        button { background: #0066cc; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
        button:hover { background: #0052a3; }
    </style>
</head>
<body>
    <div class="container">
        <h1>✅ API Key Configured</h1>
        <p class="success">Your Google Gemini API key has been saved!</p>
        <div class="info">
            <strong>ℹ️ Next steps:</strong><br>
            1. Close this window<br>
            2. Go to your openclow app (localhost:3000 or your deployment)<br>
            3. Your API key is now configured and ready to use!
        </div>
        <button onclick="window.close()">Close Window</button>
    </div>
    <script>
        // Set the API key in localStorage
        localStorage.setItem('openclow-api-key', '__API_KEY_PLACEHOLDER__');
        console.log('API key saved to localStorage');
    </script>
</body>
</html>
EOF

# Replace placeholder with actual key
sed -i "s|__API_KEY_PLACEHOLDER__|$API_KEY|g" /tmp/set-api-key.html

echo "✅ API Key Configuration"
echo "========================"
echo ""
echo "Your API key has been prepared. To apply it:"
echo ""
echo "📌 Option 1: Use the Browser (Recommended)"
echo "   1. Go to your openclow app in the browser"
echo "   2. Click the ⚙️ (Settings) icon in the left sidebar"
echo "   3. Paste your API key and click 'Save & Start'"
echo ""
echo "📌 Option 2: Open Helper Page"
echo "   A helper page has been created at: /tmp/set-api-key.html"
echo "   You can open it in your browser to auto-configure the key"
echo ""
echo "💡 Tip: The API key is stored in browser localStorage, so it will"
echo "        persist even after closing the browser (for this device)."
echo ""
