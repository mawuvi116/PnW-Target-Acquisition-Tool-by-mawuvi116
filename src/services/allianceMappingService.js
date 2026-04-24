import { fetchTopAlliances, fetchTreatyWeb } from "@/services/treatyService";

function normalizeAllianceId(value) {
  const normalized = Number.parseInt(String(value), 10);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : null;
}

function parseAllianceList(rawValue) {
  if (!rawValue) {
    return [];
  }

  return String(rawValue)
    .split(",")
    .map((value) => normalizeAllianceId(value.trim()))
    .filter(Boolean);
}

function normalizeTreatyType(value) {
  return String(value || "").trim().toUpperCase();
}

function isBlocTreaty(treatyType) {
  const normalized = normalizeTreatyType(treatyType);
  return normalized.startsWith("M");
}

function isNapTreaty(treatyType) {
  return normalizeTreatyType(treatyType) === "NAP";
}

export async function buildAllianceContext({
  allianceId,
  hostileAllianceIds = [],
}) {
  const normalizedAllianceId = normalizeAllianceId(allianceId);
  const manualHostiles = new Set(
    hostileAllianceIds.map((value) => normalizeAllianceId(value)).filter(Boolean)
  );

  if (!normalizedAllianceId) {
    return {
      allianceId: null,
      topAllianceIds: [],
      unsafeAllianceIds: [],
      friendlyAllianceIds: [],
      blocAllianceIds: [],
      hostileAllianceIds: [...manualHostiles],
      directTreatyPartners: [],
      napPartners: [],
      treaties: [],
      hasAlliance: false,
    };
  }

  const [treaties, topAlliances] = await Promise.all([
    fetchTreatyWeb(),
    fetchTopAlliances(),
  ]);

  const topAllianceIds = new Set(
    topAlliances.map((alliance) => normalizeAllianceId(alliance.id)).filter(Boolean)
  );
  const unsafeAllianceIds = new Set(topAllianceIds);
  const directTreatyPartners = new Set();
  const blocAllianceIds = new Set([normalizedAllianceId]);
  const napPartners = new Set();

  for (const treaty of treaties) {
    const alliance1Id = normalizeAllianceId(treaty.alliance1_id);
    const alliance2Id = normalizeAllianceId(treaty.alliance2_id);

    if (!alliance1Id || !alliance2Id) {
      continue;
    }

    if (topAllianceIds.has(alliance1Id)) {
      unsafeAllianceIds.add(alliance2Id);
    }

    if (topAllianceIds.has(alliance2Id)) {
      unsafeAllianceIds.add(alliance1Id);
    }

    const isUserTreaty =
      alliance1Id === normalizedAllianceId || alliance2Id === normalizedAllianceId;

    if (!isUserTreaty) {
      continue;
    }

    const partnerId =
      alliance1Id === normalizedAllianceId ? alliance2Id : alliance1Id;

    directTreatyPartners.add(partnerId);

    if (isBlocTreaty(treaty.treaty_type)) {
      blocAllianceIds.add(partnerId);
    }

    if (isNapTreaty(treaty.treaty_type)) {
      napPartners.add(partnerId);
    }
  }

  return {
    allianceId: normalizedAllianceId,
    topAllianceIds: [...topAllianceIds],
    unsafeAllianceIds: [...unsafeAllianceIds],
    friendlyAllianceIds: [...blocAllianceIds],
    blocAllianceIds: [...blocAllianceIds],
    hostileAllianceIds: [...manualHostiles],
    directTreatyPartners: [...directTreatyPartners],
    napPartners: [...napPartners],
    treaties,
    hasAlliance: true,
  };
}

export function getPoliticalSafety(targetAllianceId, allianceContext) {
  const normalizedTargetAllianceId = normalizeAllianceId(targetAllianceId);

  if (!normalizedTargetAllianceId || !allianceContext) {
    return {
      isFriendly: false,
      isUnsafe: false,
      isHostile: false,
    };
  }

  const friendlyAllianceIds = new Set(allianceContext.friendlyAllianceIds ?? []);
  const unsafeAllianceIds = new Set(allianceContext.unsafeAllianceIds ?? []);
  const hostileAllianceIds = new Set(allianceContext.hostileAllianceIds ?? []);

  return {
    isFriendly: friendlyAllianceIds.has(normalizedTargetAllianceId),
    isUnsafe: unsafeAllianceIds.has(normalizedTargetAllianceId),
    isHostile: hostileAllianceIds.has(normalizedTargetAllianceId),
  };
}

export function parseHostileAllianceIds(rawValue) {
  return parseAllianceList(rawValue);
}
