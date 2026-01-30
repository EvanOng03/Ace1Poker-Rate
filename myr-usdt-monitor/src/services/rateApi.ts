// Rate API service - Bank-grade Implementation
// Sources: ECB (Frankfurter), ExchangeRate-API (Aggregator A), OpenER (Aggregator B)

interface RateSource {
  name: string;
  weight: number; // Central Bank weight is higher
  fetch: () => Promise<number>;
}

const rateSources: RateSource[] = [
  { 
    name: 'ECB/Frankfurter', 
    weight: 0.5, // 50% weight
    fetch: async () => {
      const resp = await fetch('https://api.frankfurter.app/latest?from=USD&to=MYR');
      if (!resp.ok) throw new Error('ECB failed');
      const data = await resp.json();
      return data.rates.MYR;
    }
  },
  { 
    name: 'Aggregator A', 
    weight: 0.25, 
    fetch: async () => {
      const resp = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      if (!resp.ok) throw new Error('Aggregator A failed');
      const data = await resp.json();
      return data.rates.MYR;
    }
  },
  { 
    name: 'Aggregator B', 
    weight: 0.25, 
    fetch: async () => {
      const resp = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!resp.ok) throw new Error('Aggregator B failed');
      const data = await resp.json();
      return data.rates.MYR;
    }
  }
];

export async function fetchBankGradeRate(): Promise<number> {
  const results = await Promise.allSettled(rateSources.map(s => s.fetch()));
  
  const validRates: { rate: number; weight: number }[] = [];
  results.forEach((res, index) => {
    if (res.status === 'fulfilled') {
      validRates.push({ rate: res.value, weight: rateSources[index].weight });
    }
  });

  if (validRates.length === 0) throw new Error('All sources failed');

  // 1. Calculate temp average for outlier filtering
  const tempAvg = validRates.reduce((acc, curr) => acc + curr.rate, 0) / validRates.length;

  // 2. Filter outliers (±1% deviation)
  const filteredRates = validRates.filter(r => Math.abs(r.rate - tempAvg) / tempAvg <= 0.01);

  if (filteredRates.length === 0) return tempAvg;

  // 3. Weighted Calculation
  let totalWeight = 0;
  let weightedSum = 0;
  filteredRates.forEach(r => {
    weightedSum += r.rate * r.weight;
    totalWeight += r.weight;
  });

  return weightedSum / totalWeight;
}

// Fetch historical rates (simulated based on current rate with realistic variation)
export async function fetchHistoricalRate(days: number = 7): Promise<{ timestamp: number; rate: number }[]> {
  try {
    const currentRate = await fetchBankGradeRate();
    const history: { timestamp: number; rate: number }[] = [];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    for (let d = days; d >= 0; d--) {
      // Generate realistic daily variation (±0.5%)
      const variation = (Math.random() - 0.5) * 0.01 * currentRate;
      history.push({
        timestamp: now - d * dayMs,
        rate: currentRate + variation,
      });
    }

    return history;
  } catch (error) {
    console.error('Failed to generate historical data:', error);
    throw error;
  }
}
