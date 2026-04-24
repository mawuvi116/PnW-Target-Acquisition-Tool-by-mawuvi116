import { fetchGraphQL } from "@/services/graphQLService";

const PRICE_CACHE_TTL_MS = 5 * 60 * 1000;

let pricesCache = {
  expiresAt: 0,
  data: null,
};

export async function fetchTradePrices() {
  if (pricesCache.expiresAt > Date.now() && pricesCache.data) {
    return pricesCache.data;
  }

  const query = `
    query GetTradePrices {
      tradeprices {
        data {
          food
          coal
          oil
          uranium
          iron
          bauxite
          lead
          gasoline
          munitions
          steel
          aluminum
        }
      }
    }
  `;

  const data = await fetchGraphQL(query);
  const prices = data.tradeprices?.data?.[0] ?? null;

  pricesCache = {
    expiresAt: Date.now() + PRICE_CACHE_TTL_MS,
    data: prices,
  };

  return prices;
}
