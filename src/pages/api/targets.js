import {
  buildAllianceContext,
  getPoliticalSafety,
  parseHostileAllianceIds,
} from "@/services/allianceMappingService";
import { calculateHistoricalLoot, calculateSpeculativeInactiveLoot } from "@/services/lootService";
import {
  fetchTargetDetailsByIds,
  fetchNationById,
  fetchTargetsInRange,
  normalizeNationId,
} from "@/services/nationService";
import { fetchTradePrices } from "@/services/priceService";
import { calculateRisk } from "@/services/riskService";
import {
  calculateFinalScore,
  calculateProjectedAttackCost,
  calculateWarScore,
} from "@/services/scoringService";
import { filterTargets } from "@/utils/filters";

function parseBoolean(value, fallback = false) {
  if (value === undefined) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function parseRangeFactor(value, fallback = 1.75) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, 1.1), 2.5);
}

function parseEngine(value) {
  return String(value || "default").toLowerCase() === "advanced"
    ? "advanced"
    : "default";
}

function chunk(values, size) {
  const chunks = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

function mergeNationDetails(summaryNations, detailNations) {
  const detailById = new Map(
    detailNations.map((nation) => [Number(nation.id), nation])
  );

  return summaryNations.map((nation) => ({
    ...nation,
    wars: detailById.get(Number(nation.id))?.wars ?? [],
  }));
}

function calculatePreliminaryPriority(me, target) {
  const soldierRatio = (Number(me.soldiers ?? 0) + 1) / (Number(target.soldiers ?? 0) + 1);
  const tankRatio = (Number(me.tanks ?? 0) + 1) / (Number(target.tanks ?? 0) + 1);
  const aircraftRatio = (Number(me.aircraft ?? 0) + 1) / (Number(target.aircraft ?? 0) + 1);
  const lastActiveHours = (() => {
    const last = new Date(target.last_active).getTime();
    return Number.isFinite(last) ? (Date.now() - last) / (1000 * 60 * 60) : 999;
  })();

  return (
    soldierRatio * 16 +
    tankRatio * 14 +
    aircraftRatio * 12 +
    Math.min(lastActiveHours, 72) * 0.45 -
    Number(target.num_cities ?? 0) * 0.08
  );
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const nationId = normalizeNationId(req.query.nationId);

    if (!nationId) {
      return res
        .status(400)
        .json({ error: "nationId must be a positive whole number" });
    }

    const engine = parseEngine(req.query.engine);
    const includeUnsafe = parseBoolean(req.query.includeUnsafe, false);
    const maxRangeFactor = parseRangeFactor(req.query.maxRangeFactor, 1.75);
    const hostileAllianceIds = parseHostileAllianceIds(
      req.query.hostileAllianceIds
    );

    const me = await fetchNationById(nationId);

    if (!me) {
      return res.status(404).json({ error: "Nation not found" });
    }

    const minScore = me.score * 0.75;
    const maxScore = me.score * maxRangeFactor;

    const [nations, prices, allianceContext] = await Promise.all([
      fetchTargetsInRange({ minScore, maxScore, limit: 500 }),
      fetchTradePrices(),
      buildAllianceContext({
        allianceId: me.alliance?.id,
        hostileAllianceIds,
      }),
    ]);

    const filteredNations = filterTargets(me, nations, {
      includeUnsafe,
      allianceContext,
    });

    const shortlistLimit = Number(me.num_cities ?? 0) >= 30 ? 180 : 120;

    const shortlist = filteredNations
      .map((target) => ({
        ...target,
        __preliminaryPriority: calculatePreliminaryPriority(me, target),
      }))
      .sort((left, right) => right.__preliminaryPriority - left.__preliminaryPriority)
      .slice(0, shortlistLimit);

    const detailedNationChunks = await Promise.all(
      chunk(
        shortlist.map((target) => target.id),
        30
      ).map((ids) => fetchTargetDetailsByIds(ids))
    );
    const detailedNations = mergeNationDetails(
      shortlist,
      detailedNationChunks.flat()
    );

    const hydratedTargets = detailedNations
      .map((target) => hydrateTarget({ me, target, prices, engine, allianceContext }))
      .filter(Boolean);

    const targets = hydratedTargets
      .filter((target) => target.lootSampleSize > 0)
      .sort((left, right) => {
        if (right.projectedNetProfit !== left.projectedNetProfit) {
          return right.projectedNetProfit - left.projectedNetProfit;
        }

        if (right.loot !== left.loot) {
          return right.loot - left.loot;
        }

        if (left.risk !== right.risk) {
          return left.risk - right.risk;
        }

        return right.finalScore - left.finalScore;
      })
      .slice(0, 25);

    const speculativeTargets = hydratedTargets
      .filter((target) => target.lootSampleSize === 0 && target.speculativeLoot > 0)
      .sort((left, right) => right.speculativeLoot - left.speculativeLoot)
      .slice(0, 6)
      .map((target) => ({
        id: target.id,
        nationUrl: target.nationUrl,
        name: target.name,
        alliance: target.alliance,
        score: target.score,
        cities: target.cities,
        lastActive: target.lastActive,
        speculativeLoot: target.speculativeLoot,
        speculativeConfidence: target.speculativeConfidence,
        reason: target.speculativeReason,
      }));

    return res.status(200).json({
      count: targets.length,
      evaluatedAt: new Date().toISOString(),
      engine,
      targetRange: {
        minScore,
        maxScore,
        maxRangeFactor,
      },
      political: {
        hasAlliance: allianceContext.hasAlliance,
        allianceId: allianceContext.allianceId,
        friendlyAllianceCount: allianceContext.friendlyAllianceIds.length,
        unsafeAllianceCount: allianceContext.unsafeAllianceIds.length,
      },
      targets,
      speculativeTargets,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error.message || "Internal Server Error",
    });
  }
}

function hydrateTarget({ me, target, prices, engine, allianceContext }) {
  const lootModel = calculateHistoricalLoot(target, prices);
  const defWars = lootModel.defensiveWars;

  if (defWars >= 3) {
    return null;
  }

  const warModel = calculateWarScore(me, target);
  const riskModel = calculateRisk({ ...target, defWars }, me);
  const costModel = calculateProjectedAttackCost(me, target);
  const finalScore = calculateFinalScore({
    engine,
    warScore: warModel.score,
    loot: lootModel.estimatedLoot,
    risk: riskModel.risk,
    projectedAttackCost: costModel.projectedAttackCost,
    lootConfidence: lootModel.confidence,
    lastBeigeValue: lootModel.lastBeigeValue,
  });
  const politicalSafety = getPoliticalSafety(target.alliance?.id, allianceContext);
  const speculativeModel =
    lootModel.sampleSize === 0
      ? calculateSpeculativeInactiveLoot(target, prices)
      : null;

  return {
    id: target.id,
    nationUrl: `https://politicsandwar.com/nation/id=${target.id}`,
    name: target.nation_name,
    alliance: target.alliance?.name || "Unaffiliated",
    score: target.score,
    cities: target.num_cities,
    soldiers: target.soldiers ?? 0,
    tanks: target.tanks ?? 0,
    aircraft: target.aircraft ?? 0,
    ships: target.ships ?? 0,
    missiles: target.missiles ?? 0,
    nukes: target.nukes ?? 0,
    spies: target.spies ?? 0,
    defWars,
    lastActive: target.last_active,
    beigeTurns: target.beige_turns ?? 0,
    vacationModeTurns: target.vacation_mode_turns ?? 0,
    warScore: warModel.score,
    warBreakdown: warModel.breakdown,
    attackEstimates: warModel.estimates,
    loot: lootModel.estimatedLoot,
    lootSampleSize: lootModel.sampleSize,
    lootConfidence: lootModel.confidence,
    averageLootPerHit: lootModel.averageLootPerHit,
    lastBeigeValue: lootModel.lastBeigeValue,
    projectedAttackCost: costModel.projectedAttackCost,
    projectedNetProfit: lootModel.estimatedLoot - costModel.projectedAttackCost,
    attackStyle: costModel.attackStyle,
    risk: riskModel.risk,
    finalScore,
    isUnsafe: politicalSafety.isUnsafe,
    isHostile: politicalSafety.isHostile,
    flags: [...new Set(riskModel.flags)].filter(Boolean),
    insights: buildInsights({
      defWars,
      lootModel,
      riskModel,
      finalScore,
      attackStyle: costModel.attackStyle,
      politicalSafety,
    }),
    speculativeLoot: speculativeModel?.estimatedLoot ?? 0,
    speculativeConfidence: speculativeModel?.confidence ?? 0,
    speculativeReason: speculativeModel?.reason ?? "",
  };
}

function buildInsights({
  defWars,
  lootModel,
  riskModel,
  finalScore,
  attackStyle,
  politicalSafety,
}) {
  const insights = [];

  if (lootModel.estimatedLoot >= 1_200_000) {
    insights.push("Premium loot history");
  } else if (lootModel.estimatedLoot >= 500_000) {
    insights.push("Solid raid payout");
  }

  if (lootModel.lastBeigeValue >= 1_000_000) {
    insights.push("Strong last beige value");
  }

  if (lootModel.sampleSize >= 4) {
    insights.push("Reliable loot sample");
  }

  if (attackStyle) {
    insights.push(attackStyle);
  }

  if (riskModel.flags.includes("SLEEPING")) {
    insights.push("Likely offline window");
  } else if (riskModel.flags.includes("VERY_ACTIVE")) {
    insights.push("Recently active target");
  }

  if (defWars === 2) {
    insights.push("Last defensive war slot");
  }

  if (politicalSafety.isUnsafe) {
    insights.push("Unsafe political affiliation");
  }

  if (finalScore >= 45) {
    insights.push("Top-tier raid candidate");
  }

  return insights;
}
