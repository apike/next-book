import type { Book, Voter, RankedResult } from './types';

/**
 * Minimax Condorcet voting algorithm
 * 
 * For each pair of books, we count how many voters prefer one over the other.
 * A book's "worst defeat" is the largest margin by which it loses to any other book.
 * The winner is the book with the smallest worst defeat.
 * 
 * If a book beats all others (Condorcet winner), its worst defeat is 0 or negative.
 */
export function calculateMinimaxResults(
  books: Book[],
  completedVoters: Voter[]
): RankedResult[] {
  // Filter out excluded voters
  const activeVoters = completedVoters.filter(v => !v.excluded);
  
  if (books.length === 0 || activeVoters.length === 0) {
    return books.map((book, index) => ({
      book,
      worstDefeat: 0,
      pairwiseWins: 0,
      rank: index + 1,
    }));
  }

  const bookIds = books.map(b => b.id);
  const bookOrder = new Map(books.map((book, index) => [book.id, index]));
  
  // Build pairwise preference matrix
  // pairwise[i][j] = number of voters who prefer book i over book j
  const pairwise: Map<string, Map<string, number>> = new Map();
  
  for (const bookId of bookIds) {
    pairwise.set(bookId, new Map());
    for (const otherId of bookIds) {
      pairwise.get(bookId)!.set(otherId, 0);
    }
  }
  
  // Count preferences from active (non-excluded) voters
  for (const voter of activeVoters) {
    const rankings = voter.rankings;
    const rankedSet = new Set(rankings);
    
    // For each pair of books in the voter's ranking
    for (let i = 0; i < rankings.length; i++) {
      for (let j = i + 1; j < rankings.length; j++) {
        const preferred = rankings[i];
        const lessPreferred = rankings[j];
        
        // Voter prefers book at position i over book at position j
        if (pairwise.has(preferred) && pairwise.get(preferred)!.has(lessPreferred)) {
          pairwise.get(preferred)!.set(
            lessPreferred,
            pairwise.get(preferred)!.get(lessPreferred)! + 1
          );
        }
      }
    }
    
    // All ranked books are preferred over all unranked books
    // This ensures that voting for a book as #1 (even without ranking others)
    // counts as preferring that book over all unranked books
    for (const rankedId of rankings) {
      for (const bookId of bookIds) {
        if (!rankedSet.has(bookId)) {
          // rankedId is preferred over bookId (which is unranked by this voter)
          if (pairwise.has(rankedId) && pairwise.get(rankedId)!.has(bookId)) {
            pairwise.get(rankedId)!.set(
              bookId,
              pairwise.get(rankedId)!.get(bookId)! + 1
            );
          }
        }
      }
    }
  }
  
  // Calculate worst defeat and pairwise wins for each book
  const worstDefeats: Map<string, number> = new Map();
  const pairwiseWins: Map<string, number> = new Map();
  
  for (const bookId of bookIds) {
    let worstDefeat = Number.NEGATIVE_INFINITY;
    let pairwiseWinCount = 0;
    
    for (const opponentId of bookIds) {
      if (bookId === opponentId) continue;
      
      const votesFor = pairwise.get(bookId)!.get(opponentId)!;
      const votesAgainst = pairwise.get(opponentId)!.get(bookId)!;
      
      if (votesFor > votesAgainst) {
        pairwiseWinCount++;
      }
      
      // Defeat margin: how much we lost by (positive = we lost)
      const defeatMargin = votesAgainst - votesFor;
      
      if (defeatMargin > worstDefeat) {
        worstDefeat = defeatMargin;
      }
    }
    
    // If there's only one book, or no defeats, set to 0
    worstDefeats.set(bookId, worstDefeat === Number.NEGATIVE_INFINITY ? 0 : worstDefeat);
    pairwiseWins.set(bookId, pairwiseWinCount);
  }
  
  // Sort books by worst defeat, then pairwise wins, then original book order.
  const sortedBooks = [...books].sort((a, b) => {
    const defeatA = worstDefeats.get(a.id) ?? 0;
    const defeatB = worstDefeats.get(b.id) ?? 0;
    if (defeatA !== defeatB) {
      return defeatA - defeatB;
    }

    const winsA = pairwiseWins.get(a.id) ?? 0;
    const winsB = pairwiseWins.get(b.id) ?? 0;
    if (winsA !== winsB) {
      return winsB - winsA;
    }

    return (bookOrder.get(a.id) ?? 0) - (bookOrder.get(b.id) ?? 0);
  });
  
  // Assign ranks (handle ties)
  const results: RankedResult[] = [];
  let currentRank = 1;
  
  for (let i = 0; i < sortedBooks.length; i++) {
    const book = sortedBooks[i];
    const worstDefeat = worstDefeats.get(book.id) ?? 0;
    const pairwiseWinCount = pairwiseWins.get(book.id) ?? 0;
    
    // Check if tied with previous
    if (i > 0) {
      const prevBook = sortedBooks[i - 1];
      const prevDefeat = worstDefeats.get(prevBook.id) ?? 0;
      const prevPairwiseWins = pairwiseWins.get(prevBook.id) ?? 0;
      if (worstDefeat !== prevDefeat || pairwiseWinCount !== prevPairwiseWins) {
        currentRank = i + 1;
      }
    }
    
    results.push({
      book,
      worstDefeat,
      pairwiseWins: pairwiseWinCount,
      rank: currentRank,
    });
  }
  
  return results;
}
