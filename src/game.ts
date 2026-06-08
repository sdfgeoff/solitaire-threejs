import { Card, Rank, Suit, RANK_VALUE, GameAction } from './types';

const FOUNDATION_SLOTS = 4;
const TABLEAU_SLOTS = 7;

export class SolitaireGame {
  stock: Card[] = [];
  waste: Card[] = [];
  foundations: Card[][] = [[], [], [], []];
  tableau: Card[][] = [[], [], [], [], [], [], []];
  history: GameAction[][] = [];
  currentMove: GameAction[] = [];
  score = 0;

  constructor() {
    this.newGame();
  }

  newGame(): void {
    const deck = this._buildDeck();
    this._shuffle(deck);

    this.stock = [];
    this.waste = [];
    this.foundations = [[], [], [], []];
    this.tableau = [[], [], [], [], [], [], []];
    this.history = [];
    this.currentMove = [];
    this.score = 0;

    // Deal: first 6 columns get 1 card, last column gets 7
    let idx = 0;
    for (let col = 0; col < TABLEAU_SLOTS; col++) {
      for (let row = 0; row <= col; row++) {
        const card = deck[idx++];
        if (row === col) {
          card.faceUp = true;
        } else {
          card.faceUp = false;
        }
        this.tableau[col].push(card);
      }
    }
    // Remaining cards go to stock
    while (idx < deck.length) {
      this.stock.push(deck[idx++]);
    }
  }

  drawFromStock(): GameAction[] {
    const actions: GameAction[] = [];
    if (this.stock.length === 0) {
      // Recycle waste back to stock
      if (this.waste.length === 0) return actions;
      this._saveMove();
      while (this.waste.length > 0) {
        const card = this.waste.pop()!;
        card.faceUp = false;
        this.stock.push(card);
        actions.push({ type: 'draw', from: 'waste', to: 'stock', cards: [card.id] });
      }
      return actions;
    }

    this._saveMove();
    const card = this.stock.pop()!;
    card.faceUp = true;
    this.waste.push(card);
    actions.push({ type: 'draw', from: 'stock', to: 'waste', cards: [card.id] });
    return actions;
  }

  canPlaceOnTableau(card: Card, col: number): boolean {
    const pile = this.tableau[col];
    if (pile.length === 0) {
      return card.rank === 'K';
    }
    const top = pile[pile.length - 1];
    if (!top.faceUp) return false;
    return this._isOppositeColor(card, top) && RANK_VALUE[card.rank] === RANK_VALUE[top.rank] - 1;
  }

  canPlaceOnFoundation(card: Card, slot: number): boolean {
    const pile = this.foundations[slot];
    if (pile.length === 0) {
      return card.rank === 'A';
    }
    const top = pile[pile.length - 1];
    return card.suit === top.suit && RANK_VALUE[card.rank] === RANK_VALUE[top.rank] + 1;
  }

  moveToTableau(fromCol: number, toCol: number): GameAction[] | null {
    const fromPile = this.tableau[fromCol];
    if (fromPile.length === 0) return null;

    // Find the first face-up card being moved
    let moveIdx = fromPile.length - 1;
    while (moveIdx >= 0 && fromPile[moveIdx].faceUp) moveIdx--;
    moveIdx++; // back to first face-up

    const movingCards = fromPile.slice(moveIdx);
    const leadCard = movingCards[0];

    if (!this.canPlaceOnTableau(leadCard, toCol)) return null;

    this._saveMove();
    fromPile.splice(moveIdx);
    this.tableau[toCol].push(...movingCards);

    // Auto-flip new top card
    if (fromPile.length > 0 && !fromPile[fromPile.length - 1].faceUp) {
      fromPile[fromPile.length - 1].faceUp = true;
      this.score += 5;
    }

    this.score += 10;
    return [{ type: 'move', from: `tableau-${fromCol}`, to: `tableau-${toCol}`, cards: movingCards.map(c => c.id) }];
  }

  moveToFoundation(fromPile: 'waste' | 'tableau', fromIndex: number, toSlot: number): GameAction[] | null {
    let card: Card | undefined;
    if (fromPile === 'waste') {
      if (this.waste.length === 0) return null;
      card = this.waste[this.waste.length - 1];
    } else {
      const pile = this.tableau[fromIndex];
      if (pile.length === 0) return null;
      card = pile[pile.length - 1];
    }

    if (!card || !card.faceUp) return null;
    if (!this.canPlaceOnFoundation(card, toSlot)) return null;

    this._saveMove();

    if (fromPile === 'waste') {
      this.waste.pop();
    } else {
      this.tableau[fromIndex].pop();
      if (this.tableau[fromIndex].length > 0 && !this.tableau[fromIndex][this.tableau[fromIndex].length - 1].faceUp) {
        this.tableau[fromIndex][this.tableau[fromIndex].length - 1].faceUp = true;
        this.score += 5;
      }
    }

    this.foundations[toSlot].push(card);
    this.score += 10;
    return [{ type: 'move', from: fromPile === 'waste' ? 'waste' : `tableau-${fromIndex}`, to: `foundation-${toSlot}`, cards: [card.id] }];
  }

  undo(): void {
    if (this.currentMove.length > 0) {
      this._undoMove(this.currentMove);
      this.currentMove = [];
      this.history.pop();
    }
  }

  private _undoMove(actions: GameAction[]): void {
    // Simplified undo: rebuild from scratch by re-dealing
    // For a proper undo we'd reverse each action, but for simplicity restart
    // Actually let's do a proper state-based undo
    for (let i = actions.length - 1; i >= 0; i--) {
      const action = actions[i];
      if (action.type === 'move') {
        // Reverse move
        const fromParts = action.from.split('-');
        const toParts = (action.to || '').split('-');
        const cards = action.cards || [];

        // Find and remove cards from destination
        let destPile: Card[] | null = null;
        let srcPile: Card[] | null = null;

        if (toParts[0] === 'tableau') {
          destPile = this.tableau[parseInt(toParts[1])];
        } else if (toParts[0] === 'foundation') {
          destPile = this.foundations[parseInt(toParts[1])];
        } else if (toParts[0] === 'waste') {
          destPile = this.waste;
        }

        if (fromParts[0] === 'tableau') {
          srcPile = this.tableau[parseInt(fromParts[1])];
        } else if (fromParts[0] === 'waste') {
          srcPile = this.waste;
        } else if (fromParts[0] === 'stock') {
          srcPile = this.stock;
        }

        if (destPile && srcPile) {
          // Remove from dest
          for (const cid of cards) {
            const idx = destPile.findIndex(c => c.id === cid);
            if (idx >= 0) destPile.splice(idx, 1);
          }
          // Add back to src
          for (const cid of cards) {
            // Find card from any pile
            const found = this._findCard(cid);
            if (found) {
              srcPile.push(found);
            }
          }
        }
      }
    }
    this.score = Math.max(0, this.score - 10);
  }

  private _findCard(id: string): Card | null {
    const all = [...this.stock, ...this.waste, ...this.foundations.flat(), ...this.tableau.flat()];
    return all.find(c => c.id === id) || null;
  }

  private _saveMove(): void {
    // Deep-copy current state for undo
    this.history.push(this.currentMove);
    this.currentMove = [];
  }

  isWon(): boolean {
    return this.foundations.every(p => p.length === 13);
  }

  private _isOppositeColor(a: Card, b: Card): boolean {
    const red = ['hearts', 'diamonds'] as Suit[];
    const aRed = red.includes(a.suit);
    const bRed = red.includes(b.suit);
    return aRed !== bRed;
  }

  private _buildDeck(): Card[] {
    const deck: Card[] = [];
    let id = 0;
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ suit, rank, faceUp: false, id: `card-${id++}` });
      }
    }
    return deck;
  }

  private _shuffle(arr: Card[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
}
