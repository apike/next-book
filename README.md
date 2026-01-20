# Book Club Poll

A simple, elegant voting app for book clubs. Create a poll, add books, rank your preferences, and see results using the fair Minimax Condorcet voting method.

## Features

- **Create polls** with a secret shareable URL
- **Add books** with title and author
- **Drag-and-drop ranking** with touch support for mobile
- **Minimax Condorcet voting** - a fair ranked-choice algorithm
- **Activity log** showing who added what and when
- **Results** visible after completing your vote

## Tech Stack

- **Next.js 14** (App Router) with TypeScript
- **Tailwind CSS** for styling
- **dnd-kit** for drag-and-drop
- **Vercel KV** (Redis) for persistence

## Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

The app uses an in-memory store for local development. Data persists only while the dev server is running.

## Deployment to Vercel

1. Push this repo to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add **Vercel KV** from the Storage tab:
   - Go to your project dashboard → Storage → Create Database → KV
   - This automatically adds the required environment variables
4. Deploy!

### Environment Variables (automatically set by Vercel KV)

- `KV_REST_API_URL` - Vercel KV REST API URL
- `KV_REST_API_TOKEN` - Vercel KV API token

## How It Works

### Voting Algorithm: Minimax Condorcet

The app uses the Minimax Condorcet method to determine the winning book:

1. Each pair of books is compared head-to-head based on all voters' rankings
2. For each book, we find its "worst defeat" - the largest margin by which it loses to any other book
3. Books are ranked by who has the smallest worst defeat
4. A book that beats all others (Condorcet winner) will have a worst defeat of 0 or less

This method ensures the winner is the book with the broadest support, avoiding issues with simple plurality voting.

## Usage

1. **Create a poll** - Enter a name and get a secret URL
2. **Share the URL** - Anyone with the link can participate
3. **Add books** - Enter your name, then add book suggestions
4. **Rank your preferences** - Drag books from "Unranked" to "Your Rankings"
5. **Submit your vote** - Click "Voting Complete!" when done ranking all books
6. **See results** - After voting, view the Condorcet-ranked results

## License

MIT
