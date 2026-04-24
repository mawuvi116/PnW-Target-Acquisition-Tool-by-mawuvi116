import { fetchGraphQL } from "@/services/graphQLService";

const TREATY_CACHE_TTL_MS = 60 * 60 * 1000;
const TOP_ALLIANCE_CACHE_TTL_MS = 60 * 60 * 1000;

let treatyCache = {
  expiresAt: 0,
  data: [],
};

let topAllianceCache = {
  expiresAt: 0,
  data: [],
};

export async function fetchTreatyWeb(limit = 500) {
  if (treatyCache.expiresAt > Date.now()) {
    return treatyCache.data;
  }

  const query = `
    query GetTreatyWeb($limit: Int!) {
      treaties(first: $limit) {
        data {
          id
          alliance1_id
          alliance2_id
          treaty_type
        }
      }
    }
  `;

  const data = await fetchGraphQL(query, {
    limit: Math.max(100, Math.floor(Number(limit) || 500)),
  });

  treatyCache = {
    expiresAt: Date.now() + TREATY_CACHE_TTL_MS,
    data: data.treaties?.data ?? [],
  };

  return treatyCache.data;
}

export async function fetchTopAlliances(limit = 40) {
  if (topAllianceCache.expiresAt > Date.now()) {
    return topAllianceCache.data;
  }

  const query = `
    query GetTopAlliances($limit: Int!) {
      alliances(first: $limit, orderBy: [{ column: SCORE, order: DESC }]) {
        data {
          id
          name
          score
        }
      }
    }
  `;

  const data = await fetchGraphQL(query, {
    limit: Math.max(10, Math.floor(Number(limit) || 40)),
  });

  topAllianceCache = {
    expiresAt: Date.now() + TOP_ALLIANCE_CACHE_TTL_MS,
    data: data.alliances?.data ?? [],
  };

  return topAllianceCache.data;
}
