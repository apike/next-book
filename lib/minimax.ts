import { Book, Voter, RankedResult } from './types';

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
  if (books.length === 0 || completedVoters.length === 0) {
    return books.map((book, index) => ({
      book,
      worstDefeat: 0,
      rank: index + 1,
    }));
  }

  const bookIds = books.map(b => b.id);
  
  // Build pairwise preference matrix
  // pairwise[i][j] = number of voters who prefer book i over book j
  const pairwise: Map<string, Map<string, number>> = new Map();
  
  for (const bookId of bookIds) {
    pairwise.set(bookId, new Map());
    for (const otherId of bookIds) {
      pairwise.get(bookId)!.set(otherId, 0);
    }
  }
  
  // Count preferences from completed voters
  for (const voter of completedVoters) {
    const rankings = voter.rankings;
    
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
  }
  
  // Calculate worst defeat for each book
  const worstDefeats: Map<string, number> = new Map();
  
  for (const bookId of bookIds) {
    let worstDefeat = Number.NEGATIVE_INFINITY;
    
    for (const opponentId of bookIds) {
      if (bookId === opponentId) continue;
      
      const votesFor = pairwise.get(bookId)!.get(opponentId)!;
      const votesAgainst = pairwise.get(opponentId)!.get(bookId)!;
      
      // Defeat margin: how much we lost by (positive = we lost)
      const defeatMargin = votesAgainst - votesFor;
      
      if (defeatMargin > worstDefeat) {
        worstDefeat = defeatMargin;
      }
    }
    
    // If there's only one book, or no defeats, set to 0
    worstDefeats.set(bookId, worstDefeat === Number.NEGATIVE_INFINITY ? 0 : worstDefeat);
  }
  
  // Sort books by worst defeat (ascending - smaller is better)
  const sortedBooks = [...books].sort((a, b) => {
    const defeatA = worstDefeats.get(a.id) ?? 0;
    const defeatB = worstDefeats.get(b.id) ?? 0;
    return defeatA - defeatB;
  });
  
  // Assign ranks (handle ties)
  const results: RankedResult[] = [];
  let currentRank = 1;
  
  for (let i = 0; i < sortedBooks.length; i++) {
    const book = sortedBooks[i];
    const worstDefeat = worstDefeats.get(book.id) ?? 0;
    
    // Check if tied with previous
    if (i > 0) {
      const prevDefeat = worstDefeats.get(sortedBooks[i - 1].id) ?? 0;
      if (worstDefeat !== prevDefeat) {
        currentRank = i + 1;
      }
    }
    
    results.push({
      book,
      worstDefeat,
      rank: currentRank,
    });
  }
  
  return results;
}
