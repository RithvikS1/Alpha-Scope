# Alpha Scope - Real-time Ethereum Order Book Dashboard

Alpha Scope is a sophisticated crypto order book dashboard that provides real-time insights into Ethereum transactions using Alchemy's WebSocket API. The application offers detailed transaction analysis, wallet profiling, and AI-powered trading behavior analysis.

## Features

- 🔄 Real-time transaction monitoring and order book updates
- 🏷️ Automatic transaction labeling with intuitive emojis
- 📊 Detailed transaction analysis including price impact and slippage
- 👛 Wallet profiling with historical trading behavior
- 🤖 AI-powered trading strategy analysis
- 📈 PineScript strategy generation for TradingView
- 🔍 Advanced wallet tracking and analysis

## Tech Stack

- **Frontend**: Next.js 14, Tailwind CSS, Tremor
- **Backend**: Next.js API Routes, WebSocket
- **Database**: PostgreSQL with Prisma
- **Blockchain**: Alchemy SDK, ethers.js
- **AI**: OpenAI API
- **State Management**: TanStack Query
- **Forms**: React Hook Form, Zod

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
4. Set up the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
5. Run the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

Create a `.env.local` file with the following variables:

```env
ALCHEMY_API_KEY=your_alchemy_api_key
OPENAI_API_KEY=your_openai_api_key
DATABASE_URL=your_postgresql_url
```

## Deployment to Vercel

This project is configured for deployment on Vercel with serverless API behavior (ON when accessed, OFF when idle).

### Prerequisites

1. **Install the Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

### Deployment Steps

1. **Deploy the Project:**
   ```bash
   vercel
   ```
   Follow the prompts to link and deploy your project.

2. **Set Up Environment Variables:**
   - Go to your project in the [Vercel Dashboard](https://vercel.com/dashboard)
   - Navigate to the **Settings** tab
   - Click on **Environment Variables**
   - Add the following environment variable:
     - **Key:** `ALCHEMY_KEY`
     - **Value:** Your Alchemy API key
   - Ensure the variable is available for the necessary environments (Production, Preview, Development)

3. **Redeploy (if needed):**
   After adding environment variables, you may need to redeploy for the changes to take effect:
   ```bash
   vercel --prod
   ```

### Access Your Deployed Site

Once deployed, your site will be available at:
```
https://<project-name>.vercel.app
```

### How It Works

- The serverless function at `/api/alchemy.js` reads the `ALCHEMY_KEY` environment variable and proxies requests to the Alchemy API
- The frontend fetches data from `/api/alchemy` instead of calling Alchemy directly
- The API is serverless: it activates when someone accesses the site and deactivates when idle
- The `vercel.json` configuration routes all `/api/*` requests to the corresponding serverless function files

### Build Verification

Your existing build process remains unchanged:
```bash
npm run build
```

This will continue to work normally for both local development and Vercel deployment.

## License

MIT
