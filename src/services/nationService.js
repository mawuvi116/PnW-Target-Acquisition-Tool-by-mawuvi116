import { fetchGraphQL } from "@/services/graphQLService";

function toWholeNumber(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

export function normalizeNationId(nationId) {
  const parsed = Number.parseInt(String(nationId), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function fetchNationById(nationId) {
  const normalizedId = normalizeNationId(nationId);

  if (!normalizedId) {
    throw new Error("Invalid nationId");
  }

  const query = `
    query GetNation($id: [Int!]) {
      nations(id: $id) {
        data {
          id
          nation_name
          score
          num_cities
          last_active
          beige_turns
          vacation_mode_turns
          alliance_position
          soldiers
          tanks
          aircraft
          ships
          missiles
          nukes
          spies
          alliance {
            id
            name
          }
        }
      }
    }
  `;

  const data = await fetchGraphQL(query, {
    id: [normalizedId],
  });

  return data.nations?.data?.[0] ?? null;
}

export async function fetchTargetsInRange({ minScore, maxScore, limit = 200 }) {
  const query = `
    query GetTargets($minScore: Float!, $maxScore: Float!, $limit: Int!) {
      nations(first: $limit, min_score: $minScore, max_score: $maxScore) {
        data {
          id
          nation_name
          score
          num_cities
          alliance_position
          soldiers
          tanks
          aircraft
          ships
          missiles
          nukes
          spies
          last_active
          beige_turns
          vacation_mode_turns
          alliance {
            id
            name
          }
        }
      }
    }
  `;

  const data = await fetchGraphQL(query, {
    minScore: Number(minScore),
    maxScore: Number(maxScore),
    limit: toWholeNumber(limit) || 200,
  });

  return data.nations?.data ?? [];
}

export async function fetchTargetDetailsByIds(nationIds) {
  const normalizedIds = [...new Set((nationIds ?? []).map(normalizeNationId).filter(Boolean))];

  if (normalizedIds.length === 0) {
    return [];
  }

  const query = `
    query GetTargetDetails($id: [Int!]) {
      nations(id: $id) {
        data {
          id
          wars {
            id
            date
            def_id
            att_id
            turns_left
            winner_id
            attacks {
              money_looted
              money_stolen
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
    }
  `;

  const data = await fetchGraphQL(query, {
    id: normalizedIds,
  });

  return data.nations?.data ?? [];
}
