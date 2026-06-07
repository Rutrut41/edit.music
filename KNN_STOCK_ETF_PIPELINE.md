# Hypothetical KNN-Based Stock/ETF System Architecture
## Mapping the Music Library Pipeline to Financial Markets

**Status:** Purely hypothetical architecture document. No code changes made to the project.

---

## Executive Summary

This document describes how the music library's scan/cache/normalization pipeline could be fundamentally reimagined if applied to stocks and ETFs instead of music files. The key insight: **KNN trees become load-bearing** in this system because data is streaming and correlated, not static and embedded in files.

---

## Part 1: Domain Translation (Music → Stocks)

### Current Music Library Model
```
File System (source)
    ↓
Scan + Parse (extract tags from files)
    ↓
Cache (mtime-based incremental)
    ↓
Normalize + Tokenize (user-driven)
    ↓
Inverted Index + Cooccurrence Matrix
    ↓
Genre relationships (cooccurrence similarity)
```

**Problem with Stocks/ETFs:** Files don't exist; APIs provide streaming data with **no mtime equivalent**.

---

### Reimagined Stock/ETF Model
```
Market Data APIs (source)
    ↓
Continuous Ingestion (firehose: prices, volume, fundamentals)
    ↓
CEV Builder (construct exposure vectors from business signals)
    ↓
KNN Index + Similarity Graph (KNN trees are core, not optional)
    ↓
ETF Aggregation + Projection (derive ETF vectors from stock CEVs)
    ↓
Market Geometry (clusters, relationships, topology)
```

**Why KNN is now essential:** You're navigating a high-dimensional space (15-dim exposure vectors) where similarity relationships are the primary query pattern, and **you can't use mtime** to optimize—KNN trees are your only efficient lookup mechanism.

---

## Part 2: Layer-by-Layer System Design

### LAYER 0: CORE DATA OBJECTS

#### 0.1 Stock Exposure Vector (CEV)
**Replaces:** Genre tags in the music library

```typescript
// Current (music): 
type GenreEntry = {
  abs: string;        // file path
  mtime: number;
  genre: string;      // single normalized genre
  genres: string[];   // tokenized genres
}

// Hypothetical (stocks):
type StockExposureVector = {
  ticker: string;
  cevVector: number[];  // [15] dimensions: tech_services, hardware, platform, ...
  confidenceScores: Record<string, number>;  // per-dimension confidence
  lastUpdated: number;  // timestamp (not mtime—API freshness indicator)
  source: 'embeddings' | 'sector' | 'revenue' | 'geo' | 'hybrid';
}
```

**Dimensionality:** 15-dimensional vector (vs. music's categorical tags)
- tech_services: 0.0 → 1.0 (AAPL = 0.85, XOM = 0.05)
- hardware: 0.0 → 1.0
- platform: 0.0 → 1.0
- industrial: 0.0 → 1.0
- consumer_brand: 0.0 → 1.0
- healthcare: 0.0 → 1.0
- energy: 0.0 → 1.0
- financial_services: 0.0 → 1.0
- commodities: 0.0 → 1.0
- logistics: 0.0 → 1.0
- infrastructure: 0.0 → 1.0
- software: 0.0 → 1.0
- media: 0.0 → 1.0
- defense: 0.0 → 1.0
- real_estate: 0.0 → 1.0

---

## Part 3: Stock Relationship Layer

**This is where KNN trees become load-bearing.**

### 3.1 KNN Graph Construction
**This is mandatory, not optional.**

```typescript
// Current (music):
// Genre cooccurrence implicitly provides neighbors
// But: not distance-based, not optimized for lookup

// Hypothetical (stocks):
async function buildKNNIndex(cevMatrix: number[][]): Promise<KNNIndex> {
  // Use HNSW (Hierarchical Navigable Small World) or Annoy
  // Input: 7,000 vectors × 15 dimensions
  // Output: Index structure enabling ~O(log N) nearest-neighbor queries
  
  const index = new HNSWIndex({
    dimensions: 15,
    maxConnections: 16,
    efConstruction: 200,
  });
  
  for (const [ticker, cevVector] of Object.entries(stockCEV)) {
    index.add(ticker, cevVector);
  }
  
  return index;
  // Size: ~50-100MB on disk
  // Query time: ~1-5ms per nearest-neighbor search
}

// Query example:
const topK = index.search(cevVector, 20);
// Returns: [
//   { ticker: 'MSFT', distance: 0.05 },
//   { ticker: 'ADBE', distance: 0.08 },
//   ...
// ]
```

**Why mtime optimization doesn't apply:**
- If stock AAPL's business description changes (rare), CEV changes
- But there's **no "mtime" to signal this**
- Could use API version numbers or ETL timestamps, but they're unreliable
- **Solution:** Rebuild CEV for all tickers on a schedule (hourly/daily) or on signal

---

## Part 4: ETF System (DERIVED LAYER)

**New layer, no music equivalent.**

### 4.1 ETF Holdings Ingestion
```typescript
// Input: ETF prospectus or iShares/Vanguard API
type ETFHoldings = {
  etfTicker: string;
  holdings: Array<{
    ticker: string;
    weight: number;  // 0.0 → 1.0, sum to 1.0
  }>;
  rebalanceDate: number;
}
```

### 4.2 Holdings-Based ETF Vector (MODE A)
```typescript
function deriveETFVectorFromHoldings(holdings: ETFHoldings): number[] {
  // Weighted sum of constituent stock CEVs
  let etfCEV = [0, 0, 0, ..., 0];  // 15 dimensions
  
  for (const { ticker, weight } of holdings.holdings) {
    etfCEV = vectorAdd(
      etfCEV,
      vectorScale(stockCEV[ticker], weight)
    );
  }
  
  return normalize(etfCEV);  // L2-normalize
}
```

---

## Part 5: Unified Market Space Layer

### 5.1 Shared Vector Space Definition
```typescript
type MarketSpace = {
  // All entities in one 15-dimensional space:
  stocks: Record<Ticker, { cevVector: number[] }>;
  etfs: Record<ETFTicker, { cevVector: number[] }>;
  clusters: Record<ClusterID, { centroid: number[] }>;
  
  // Index structures (KNN):
  stockKNNIndex: HNSWIndex;
  etfKNNIndex: HNSWIndex;
  clusterKNNIndex: HNSWIndex;
}
```

---

## Part 6: Portfolio Import & Visualization Layer

**NEW CAPABILITY:** Import personal portfolio from Fidelity CSV and highlight owned positions in the market map.

**Complexity Assessment:** Simple to moderate (straightforward data mapping, no complex computation).

---

### 6.1 Fidelity CSV Import Structure

#### Input: Fidelity Position Export
```
Standard Fidelity CSV format (Account Summary section):

Symbol,Quantity,Price,Position Value,Open Price,%Change,Annual Income,YTD Return $,YTD Return %
AAPL,150,195.30,29295.00,182.50,6.99%,0.00,1845.00,6.69%
MSFT,50,425.18,21259.00,350.12,21.45%,0.00,3753.00,21.35%
VTI,200,250.45,50090.00,245.00,2.23%,1200.00,1090.00,2.22%
VXUS,100,65.20,6520.00,60.50,7.76%,285.00,470.00,7.78%
```

#### Parsed Data Structure
```typescript
type PortfolioPosition = {
  ticker: string;               // "AAPL"
  quantity: number;             // 150 shares
  currentPrice: number;         // 195.30
  totalMarketValue: number;     // 29,295.00
  entryPrice?: number;          // 182.50 (optional)
  unrealizedGainPercent?: number; // 6.99%
  annualIncome?: number;        // dividend income
  ytdReturn?: {
    dollars: number;
    percent: number;
  };
  importDate: number;           // timestamp of import
  accountType?: 'taxable' | 'retirement' | 'other';
}

type Portfolio = {
  positions: PortfolioPosition[];
  totalValue: number;
  importedAt: number;
  brokerageSource: 'fidelity' | 'vanguard' | 'schwab' | 'other';
  accountName?: string;
}
```

---

### 6.2 CSV Parser & Ticker Normalization

```typescript
async function importFidelityCSV(csvFile: File): Promise<Portfolio> {
  const lines = await csvFile.text();
  const rows = lines.split('\n').slice(1); // skip header
  
  const positions: PortfolioPosition[] = [];
  let totalValue = 0;
  
  for (const row of rows) {
    if (!row.trim()) continue;
    
    const [
      symbol,
      quantity,
      price,
      positionValue,
      openPrice,
      changePercent,
      annualIncome,
      ytdReturnDollar,
      ytdReturnPercent
    ] = row.split(',').map(s => s.trim());
    
    const position: PortfolioPosition = {
      ticker: symbol.toUpperCase(),
      quantity: parseFloat(quantity),
      currentPrice: parseFloat(price),
      totalMarketValue: parseFloat(positionValue),
      entryPrice: parseFloat(openPrice),
      unrealizedGainPercent: parseFloat(changePercent),
      annualIncome: parseFloat(annualIncome) || 0,
      ytdReturn: {
        dollars: parseFloat(ytdReturnDollar),
        percent: parseFloat(ytdReturnPercent)
      },
      importDate: Date.now(),
      accountType: 'taxable'
    };
    
    positions.push(position);
    totalValue += position.totalMarketValue;
  }
  
  return {
    positions,
    totalValue,
    importedAt: Date.now(),
    brokerageSource: 'fidelity'
  };
}
```

---

### 6.3 Portfolio Integration with Stock/ETF Vectors

```typescript
async function enrichStocksWithPortfolio(
  portfolio: Portfolio,
  stocks: Record<Ticker, StockIntelligence>
): Promise<void> {
  for (const position of portfolio.positions) {
    const { ticker, quantity, totalMarketValue, unrealizedGainPercent } = position;
    
    if (stocks[ticker]) {
      stocks[ticker].ownedPosition = {
        quantity,
        totalMarketValue,
        entryPrice: position.entryPrice,
        unrealizedGain: unrealizedGainPercent,
        annualIncome: position.annualIncome,
        ytdReturn: position.ytdReturn,
        isOwned: true,
        portfolioWeight: totalMarketValue / portfolio.totalValue
      };
    }
  }
}
```

---

### 6.4 Portfolio Exposure Analysis

```typescript
function computePortfolioExposure(
  portfolio: Portfolio,
  stocks: Record<Ticker, StockIntelligence>
): {
  portfolioExposure: number[];
  exposureBreakdown: Record<string, number>;
} {
  const portfolioExposure = [0, 0, 0, ..., 0];  // 15 zeros
  
  for (const position of portfolio.positions) {
    const stock = stocks[position.ticker];
    if (!stock) continue;
    
    const weight = position.totalMarketValue / portfolio.totalValue;
    const stockCEV = stock.cevVector;
    
    for (let i = 0; i < 15; i++) {
      portfolioExposure[i] += weight * stockCEV[i];
    }
  }
  
  const normalized = portfolioExposure.map(v => v / portfolioExposure.reduce((a, b) => a + b, 1));
  
  const categoryNames = [
    'tech_services', 'hardware', 'platform', 'industrial',
    'consumer_brand', 'healthcare', 'energy', 'financial_services',
    'commodities', 'logistics', 'infrastructure', 'software',
    'media', 'defense', 'real_estate'
  ];
  
  const exposureBreakdown: Record<string, number> = {};
  for (let i = 0; i < 15; i++) {
    exposureBreakdown[categoryNames[i]] = normalized[i];
  }
  
  return { portfolioExposure: normalized, exposureBreakdown };
}
```

---

### 6.5 Visualization & Portfolio Queries

```typescript
// Example 1: Find similar stocks to largest position
function findSimilarToTopHoldings(portfolio: Portfolio, k: number = 10) {
  const topPosition = portfolio.positions[0];
  const similarStocks = knnIndex.search(stockCEV[topPosition.ticker], k);
  
  return similarStocks.map(ticker => ({
    ticker,
    owned: portfolio.positions.some(p => p.ticker === ticker),
    similarity: distance
  }));
}

// Example 2: Find exposure gaps
function findExposureGaps(portfolio: Portfolio, exposure: number[]) {
  const marketExposure = marketGeometry.aggregateExposure;
  const gaps = [];
  
  for (let i = 0; i < 15; i++) {
    const diff = marketExposure[i] - exposure[i];
    if (diff > 0.1) {
      gaps.push({
        sector: categoryNames[i],
        deficit: diff,
        topStocks: findTopStocksInSector(i, 5)
      });
    }
  }
  
  return gaps;
}

// Example 3: Find correlated positions (concentration risk)
function findCorrelatedHoldings(portfolio: Portfolio) {
  const pairs = [];
  
  for (let i = 0; i < portfolio.positions.length; i++) {
    for (let j = i + 1; j < portfolio.positions.length; j++) {
      const t1 = portfolio.positions[i].ticker;
      const t2 = portfolio.positions[j].ticker;
      
      const similarity = cosineSimilarity(
        stockCEV[t1],
        stockCEV[t2]
      );
      
      if (similarity > 0.8) {
        pairs.push({
          pair: [t1, t2],
          similarity,
          combinedWeight: (portfolio.positions[i].totalMarketValue + portfolio.positions[j].totalMarketValue) / portfolio.totalValue
        });
      }
    }
  }
  
  return pairs.sort((a, b) => b.similarity - a.similarity);
}
```

---

### 6.6 Complexity & Implementation Effort

| Task | Complexity | Effort |
|------|-----------|--------|
| CSV Parser | Trivial | 30 min |
| Ticker Normalization | Simple | 1 hour |
| Portfolio Integration | Simple | 2 hours |
| Market Map Coloring | Simple | 2 hours |
| Portfolio Queries | Moderate | 4-6 hours |
| UI Components | Moderate | 4 hours |
| **Total** | **Simple** | **~12-14 hours** |

**Why it's simple:**
- No new KNN computation (uses existing indices)
- No new embeddings (uses existing CEVs)
- Just data mapping + visualization overlays
- CSV parsing is straightforward

**Why it's powerful:**
- Shows portfolio concentration risk
- Enables "find similar to my holdings" queries
- Surfaces exposure gaps
- Enables cluster-based diversification checks

---

## Summary: Why KNN Becomes Essential for Stocks/ETFs

**In music:** Genre cooccurrence works fine. KNN is optional.

**In stocks:** 
- 7,000 stocks × 2,000 ETFs = millions of pairwise comparisons
- Brute-force similarity queries would timeout
- KNN index provides O(log N) queries instead of O(N²)
- **KNN is architectural necessity, not optimization**

---

**Document Status:** Hypothetical. No code changes made to the project. Reference only.
