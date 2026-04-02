# openclow ULTRA — Free AI Assistant

A beautiful, modern AI chat application powered by HuggingFace's free inference API, with Gemini and OpenAI fallback support. Built with Next.js, React, TypeScript, and Tailwind CSS.

## Features

- **🤗 HuggingFace Integration**: Free-tier AI (Zephyr-7B) with no credit card required
- **☁️ Fallback Support**: Automatic fallback to Gemini or OpenAI if HuggingFace is unavailable
- **✨ Beautiful UI**: Glassmorphism design with smooth animations
- **✅ Task Management**: Built-in task tracking with priority levels
- **🔄 Real-time Status**: Live AI availability indicator
- **💾 Local Storage**: Persistent chat history and tasks
- **🚀 Production-Ready**: Deployed to GitHub Pages with CI/CD automation

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- API keys for at least one AI provider (see below)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/rintuchowdory/openclow.git
cd openclow
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file with your API keys:
```bash
cp .env.example .env.local
```

4. Edit `.env.local` and add your API keys (see API Configuration below)

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## API Configuration

### HuggingFace (Recommended — Free)

1. Visit [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Create a new access token (read-only is sufficient)
3. Add to `.env.local`:
```
HUGGINGFACE_API_KEY=hf_your_token_here
NEXT_PUBLIC_HUGGINGFACE_API_KEY=hf_your_token_here
```

**Why HuggingFace?** The free tier provides unlimited API calls to the Zephyr-7B model with no credit card required.

### Gemini (Free with Limits)

1. Visit [ai.google.dev](https://ai.google.dev)
2. Click "Get API Key" and create a new API key
3. Add to `.env.local`:
```
NEXT_PUBLIC_GEMINI_KEY=your_gemini_key_here
```

**Note**: Gemini is used as a fallback if HuggingFace is unavailable.

### OpenAI (Paid)

1. Visit [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add to `.env.local`:
```
OPENAI_API_KEY=sk_your_key_here
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server (http://localhost:3000) |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run export` | Export as static site (for GitHub Pages) |
| `npm run lint` | Run ESLint |

## Deployment

### GitHub Pages (Recommended)

The project is automatically deployed to GitHub Pages when you push to the `main` branch.

**Important**: To enable API functionality on GitHub Pages, you must add your API keys as GitHub Secrets:

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add:
   - `HUGGINGFACE_API_KEY`
   - `NEXT_PUBLIC_HUGGINGFACE_API_KEY`
   - `NEXT_PUBLIC_GEMINI_KEY`
   - `OPENAI_API_KEY`

The GitHub Actions workflow will automatically use these secrets during the build process.

### Vercel (Alternative)

For a production-ready deployment with server-side rendering:

1. Push your repository to GitHub
2. Visit [vercel.com](https://vercel.com) and import your repository
3. Add environment variables in the Vercel dashboard
4. Deploy

## Troubleshooting

### "HuggingFace unavailable" Error

**Cause**: The `HUGGINGFACE_API_KEY` environment variable is not set or invalid.

**Solution**:
1. Verify your API key at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Ensure it's added to `.env.local` for local development
3. For GitHub Pages deployment, add it as a GitHub Secret (see Deployment section)
4. Restart the development server: `npm run dev`

### API Key Not Working on GitHub Pages

**Cause**: Environment variables are not being passed to the build process.

**Solution**:
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Verify all secrets are correctly added
3. Re-run the workflow or push a new commit to trigger a rebuild
4. Check the GitHub Actions log for errors

### Build Fails with "API Key is not set"

**Cause**: The build process doesn't have access to the environment variables.

**Solution**:
1. Ensure secrets are added to GitHub Actions (not repository variables)
2. Check the workflow file `.github/workflows/ci.yml` includes the environment variables
3. Verify the secret names match exactly (case-sensitive)

### Slow Response Times

**Cause**: HuggingFace free tier may have rate limiting or queue delays.

**Solution**:
1. Consider adding a Gemini or OpenAI API key as a fallback
2. Wait a few moments and try again
3. Check HuggingFace status at [status.huggingface.co](https://status.huggingface.co)

## Project Structure

```
openclow/
├── src/
│   └── app/
│       ├── api/
│       │   ├── huggingface/route.ts    # HuggingFace API endpoint
│       │   ├── gemini/route.ts         # Gemini API endpoint (client-side)
│       │   └── openai/route.ts         # OpenAI API endpoint
│       ├── globals.css                 # Global styles
│       ├── layout.tsx                  # Root layout
│       └── page.tsx                    # Main application
├── .env.example                        # Environment variables template
├── .env.local                          # Local environment variables (not committed)
├── next.config.js                      # Next.js configuration
├── tailwind.config.js                  # Tailwind CSS configuration
└── package.json                        # Dependencies and scripts
```

## How It Works

1. **Frontend** (`page.tsx`): React component that handles chat UI, task management, and AI provider selection
2. **API Routes** (`api/*/route.ts`): Server-side endpoints that securely handle API keys and communicate with AI providers
3. **Environment Variables**: Sensitive keys are stored in `.env.local` (local) or GitHub Secrets (production)
4. **Fallback Logic**: Automatically switches to Gemini if HuggingFace is unavailable

## Security

- **API keys are never exposed to the client**: Server-side routes handle all sensitive communication
- **Environment variables are protected**: Use `.env.local` locally and GitHub Secrets in production
- **No hardcoded credentials**: All keys are loaded from environment variables

## Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## License

MIT License — Feel free to use this project for personal or commercial purposes.

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review the GitHub Issues
3. Open a new issue with details about your problem

## Changelog

### v0.1.0 (Initial Release)
- HuggingFace integration with free-tier Zephyr-7B model
- Gemini and OpenAI fallback support
- Task management system
- Beautiful glassmorphism UI
- GitHub Pages deployment with CI/CD
- Local storage for chat history and tasks
