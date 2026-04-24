import { fetchGraphQL } from "@/services/graphQLService";

const WAR_CACHE_TTL_MS = 5 * 60 * 1000;

let warsCache = {
  expiresAt: 0,
  data: [],
};

export async function fetchRecentWars(limit = 500) {
  if (warsCache.expiresAt > Date.now()) {
    return warsCache.data;
  }

  const query = `
    query GetRecentWars($limit: Int!) {
      wars(first: $limit) {
        data {
          id
          att_id
          def_id
          winner_id
          turns_left
          attacks {
            money_looted
            food_looted
            coal_looted
            oil_looted
            uranium_looted
            iron_looted
            bauxite_looted
            lead_looted
            gasoline_looted
            munitions_looted
            steel_looted
            aluminum_looted
          }
        }
      }
    }
  `;

  const data = await fetchGraphQL(query, {
    limit: Math.max(100, Math.floor(Number(limit) || 500)),
  });

  warsCache = {
    expiresAt: Date.now() + WAR_CACHE_TTL_MS,
    data: data.wars?.data ?? [],
  };

  return warsCache.data;
}
