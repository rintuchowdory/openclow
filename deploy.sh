#!/bin/bash
echo "🚀 Deploying openclow to GitHub Pages..."
npm run build
touch out/.nojekyll
npx gh-pages -d out -t true
echo "✅ Deployed! Check: https://rintuchowdory.github.io/openclow"
