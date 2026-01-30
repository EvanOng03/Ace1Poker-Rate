// Rate API service with multiple fallback sources

// USDT is typically very close to 1 USD, so we use USD/MYR as base
// Then USDT/MYR ≈ USD/MYR * 1.00 (with small variation)

interface RateSource {
  name: string;
  fetch: () => Promise<number>;
}

// Source 1: ExchangeRate API (free, CORS-enabled)
async function fetchFromExchangeRateAPI(): Promise<number> {
  const response = await fetch(
    'https://api.exchangerate-api.com/v4/latest/USD'
  );
  if (!response.ok) throw new Error('ExchangeRate API failed');
  const data = await response.json();
  // USD/MYR rate, USDT ≈ USD with slight premium
  return data.rates.MYR * 1.002; // 0.2% typical USDT premium
}

// Source 2: Open Exchange Rates (backup)
async function fetchFromOpenExchangeRates(): Promise<number> {
  const response = await fetch(
    'https://open.er-api.com/v6/latest/USD'
  );
  if (!response.ok) throw new Error('Open ER API failed');
  const data = await response.json();
  return data.rates.MYR * 1.002;
}

// Source 3: Frankfurter API (ECB data)
async function fetchFromFrankfurter(): Promise<number> {
  const response = await fetch(
    'https://api.frankfurter.app/latest?from=USD&to=MYR'
  );
  if (!response.ok) throw new Error('Frankfurter API failed');
  const data = await response.json();
  return data.rates.MYR * 1.002;
}

// Source 4: Currency API (another backup)
async function fetchFromCurrencyAPI(): Promise<number> {
  const response = await fetch(
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json'
  );
  if (!response.ok) throw new Error('Currency API failed');
  const data = await response.json();
  return data.usd.myr * 1.002;
}

const rateSources: RateSource[] = [
  { name: 'ExchangeRate API', fetch: fetchFromExchangeRateAPI },
  { name: 'Open ER API', fetch: fetchFromOpenExchangeRates },
  { name: 'Currency API', fetch: fetchFromCurrencyAPI },
  { name: 'Frankfurter', fetch: fetchFromFrankfurter },
];

// Try each source until one succeeds
export async function fetchUSDTMYRRate(): Promise<number> {
  let lastError: Error | null = null;

  for (const source of rateSources) {
    try {
      console.log(`Trying ${source.name}...`);
      const rate = await source.fetch();
      console.log(`Success from ${source.name}: ${rate}`);
      return rate;
    } catch (error) {
      console.warn(`${source.name} failed:`, error);
      lastError = error as Error;
    }
  }

  // If all sources fail, throw the last error
  throw lastError || new Error('All rate sources failed');
}

// Fetch historical rates (simulated based on current rate with realistic variation)
export async function fetchHistoricalRate(days: number = 7): Promise<{ timestamp: number; rate: number }[]> {
  try {
    const currentRate = await fetchUSDTMYRRate();
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
