# Book Club Poll

A voting app for book clubs. Create a poll, add books, rank your preferences, and see results using Minimax Condorcet voting.

This started as an experiment about how complex an app Claude Opus 4.5 could one-shot with thorough enough specification and guidance, and has had UX iteration from user testing from there.

## Features

- **Shareable polls** with a secret URL
- **Drag-and-drop ranking** (works on mobile)
- **Fair ranked-choice voting** via Minimax Condorcet
- **Activity log** showing who added what

## Tech Stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS
- dnd-kit for drag-and-drop
- Upstash Redis for persistence

## Development

```bash
npm install
npm run dev
```

Requires an Upstash Redis database. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in your environment.

## Deployment

Deploy to Vercel and add an [Upstash Redis](https://upstash.com/) database. The Upstash integration will set the required environment variables automatically.

## How Voting Works

The app uses Minimax Condorcet to find the book with the broadest support:

1. Each pair of books is compared head-to-head across all rankings
2. Each book's "worst defeat" is its largest loss margin against any other book
3. The winner is the book with the smallest worst defeat

A Condorcet winner (one that beats all others head-to-head) will always win.

## License

MIT

## Next Up Todos

- Allow excluding users' votes
  - This is slightly risky since we have no auth. Propose letting any member soft-delete any member's vote, but also any member can un-soft-delete a vote.
- Set favicon (right now it shows vercel)
- Let any user optionally add a passkey so they can return to see results
- Improve colour scheme on mobile (weird and overly blue)
- Let longer event titles wrap on mobile (easy for this to get cut off)
- Footer layout is a bit janky
- Set an optional deadline to vote
- Security review (especially XSS/injection)
