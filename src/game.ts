import { Card, Rank, Suit, RANK_VALUE } from './types';

const TABLEAU_SLOTS = 7;

interface Snapshot {
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
  tableau: Card[][];
  score: number;
}

function cloneCards(cards: Card[]): Card[] {
  return cards.map(c => ({ ...c }));
}

function cloneState(g: SolitaireGame): Snapshot {
  return {
    stock: cloneCards(g.stock),
    waste: cloneCards(g.waste),
    foundations: g.foundations.map(p => cloneCards(p)),
    tableau: g.tableau.map(p => cloneCards(p)),
    score: g.score,
  };
}

function restoreState(g: SolitaireGame, s: Snapshot): void {
  g.stock = s.stock;
  g.waste = s.waste;
  g.foundations = s.foundations;
  g.tableau = s.tableau;
  g.score = s.score;
}

export class SolitaireGame {
  stock: Card[] = [];
  waste: Card[] = [];
  foundations: Card[][] = [[], [], [], []];
  tableau: Card[][] = [[], [], [], [], [], [], []];
  history: Snapshot[] = [];
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
    this.score = 0;

    let idx = 0;
    for (let col = 0; col < TABLEAU_SLOTS; col++) {
      for (let row = 0; row <= col; row++) {
        const card = deck[idx++];
        card.faceUp = row === col;
        this.tableau[col].push(card);
      }
    }
    while (idx < deck.length) {
      this.stock.push(deck[idx++]);
    }
  }

  drawFromStock(): void {
    if (this.stock.length === 0) {
      if (this.waste.length === 0) return;
      this.history.push(cloneState(this));
      while (this.waste.length > 0) {
        const card = this.waste.pop()!;
        card.faceUp = false;
        this.stock.push(card);
      }
      return;
    }

    this.history.push(cloneState(this));
    const card = this.stock.pop()!;
    card.faceUp = true;
    this.waste.push(card);
  }

  canPlaceOnTableau(card: Card, col: number): boolean {
    const pile = this.tableau[col];
    if (pile.length === 0) return card.rank === 'K';
    const top = pile[pile.length - 1];
    if (!top.faceUp) return false;
    return this._oppositeColor(card, top) && RANK_VALUE[card.rank] === RANK_VALUE[top.rank] - 1;
  }

  canPlaceOnFoundation(card: Card, slot: number): boolean {
    const pile = this.foundations[slot];
    if (pile.length === 0) return card.rank === 'A';
    const top = pile[pile.length - 1];
    return card.suit === top.suit && RANK_VALUE[card.rank] === RANK_VALUE[top.rank] + 1;
  }

  moveToTableau(fromCol: number, toCol: number): boolean {
    const fromPile = this.tableau[fromCol];
    if (fromPile.length === 0) return false;

    let moveIdx = fromPile.length - 1;
    while (moveIdx >= 0 && fromPile[moveIdx].faceUp) moveIdx--;
    moveIdx++;

    const leadCard = fromPile[moveIdx];
    if (!this.canPlaceOnTableau(leadCard, toCol)) return false;

    this.history.push(cloneState(this));
    const moving = fromPile.splice(moveIdx);
    this.tableau[toCol].push(...moving);

    if (fromPile.length > 0 && !fromPile[fromPile.length - 1].faceUp) {
      fromPile[fromPile.length - 1].faceUp = true;
      this.score += 5;
    }
    this.score += 10;
    return true;
  }

  moveToFoundation(from: 'waste' | 'tableau', fromIndex: number, toSlot: number): boolean {
    let card: Card | undefined;
    if (from === 'waste') {
      if (this.waste.length === 0) return false;
      card = this.waste[this.waste.length - 1];
    } else {
      const pile = this.tableau[fromIndex];
      if (pile.length === 0) return false;
      card = pile[pile.length - 1];
    }

    if (!card || !card.faceUp) return false;
    if (!this.canPlaceOnFoundation(card, toSlot)) return false;

    this.history.push(cloneState(this));

    if (from === 'waste') {
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
    return true;
  }

  undo(): void {
    if (this.history.length === 0) return;
    restoreState(this, this.history.pop()!);
  }

  isWon(): boolean {
    return this.foundations.every(p => p.length === 13);
  }

  private _oppositeColor(a: Card, b: Card): boolean {
    const red = a.suit === 'hearts' || a.suit === 'diamonds';
    const red2 = b.suit === 'hearts' || b.suit === 'diamonds';
    return red !== red2;
  }

  private _buildDeck(): Card[] {
    const deck: Card[] = [];
    let id = 0;
    for (const suit of ['hearts', 'diamonds', 'clubs', 'spades'] as Suit[]) {
      for (const rank of ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as Rank[]) {
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
