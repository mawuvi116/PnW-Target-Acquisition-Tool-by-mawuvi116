import { getHoursSinceActive } from "@/utils/timeUtils";
import { clamp, round, toNumber } from "@/utils/calculations";

export function convertToMoney(attack, prices) {
  return (
    toNumber(attack.money_looted) +
    toNumber(attack.money_stolen) +
    toNumber(attack.food_looted) * toNumber(prices?.food) +
    toNumber(attack.coal_looted) * toNumber(prices?.coal) +
    toNumber(attack.oil_looted) * toNumber(prices?.oil) +
    toNumber(attack.uranium_looted) * toNumber(prices?.uranium) +
    toNumber(attack.iron_looted) * toNumber(prices?.iron) +
    toNumber(attack.bauxite_looted) * toNumber(prices?.bauxite) +
    toNumber(attack.lead_looted) * toNumber(prices?.lead) +
    toNumber(attack.gasoline_looted) * toNumber(prices?.gasoline) +
    toNumber(attack.munitions_looted) * toNumber(prices?.munitions) +
    toNumber(attack.steel_looted) * toNumber(prices?.steel) +
    toNumber(attack.aluminum_looted) * toNumber(prices?.aluminum)
  );
}

export function calculateHistoricalLoot(target, prices) {
  if (!prices) {
    return emptyLootModel("Market prices unavailable");
  }

  let defensiveWars = 0;
  let lootTotal = 0;
  let validWarCount = 0;
  let lootBearingAttacks = 0;
  let lastBeigeValue = null;

  for (const war of target.wars ?? []) {
    if (war.def_id === target.id && war.turns_left > 0) {
      defensiveWars += 1;
      continue;
    }

    if (war.def_id !== target.id) continue;
    if (war.turns_left > 0) continue;
    if (war.winner_id === target.id) continue;

    const warLoot = (war.attacks ?? []).reduce((sum, attack) => {
      const value = convertToMoney(attack, prices);

      if (value > 0) {
        lootBearingAttacks += 1;
      }

      return sum + value;
    }, 0);

    if (warLoot <= 0) continue;

    if (validWarCount === 0) {
      lastBeigeValue = warLoot;
    }

    lootTotal += warLoot;
    validWarCount += 1;

    if (validWarCount >= 10) {
      break;
    }
  }

  if (validWarCount === 0) {
    return {
      ...emptyLootModel("No qualifying defensive loot history"),
      defensiveWars,
    };
  }

  const estimatedLoot = lootTotal / validWarCount;
  const averageLootPerHit = lootTotal / Math.max(lootBearingAttacks, 1);
  const confidence = clamp(validWarCount / 6, 0.2, 1);

  return {
    estimatedLoot: round(estimatedLoot, 0),
    sampleSize: validWarCount,
    confidence: round(confidence, 2),
    averageLootPerHit: round(averageLootPerHit, 0),
    lastBeigeValue: round(lastBeigeValue ?? estimatedLoot, 0),
    defensiveWars,
    reasons: [
      `${validWarCount} completed defensive losses`,
      `${lootBearingAttacks} loot-bearing attacks tracked`,
    ],
  };
}

export function calculateSpeculativeInactiveLoot(target, prices) {
  const hoursInactive = getHoursSinceActive(target.last_active);

  if (!Number.isFinite(hoursInactive) || hoursInactive < 24) {
    return null;
  }

  const cityCount = toNumber(target.num_cities, 0);
  const militaryDrag =
    toNumber(target.soldiers) * 0.45 +
    toNumber(target.tanks) * 22 +
    toNumber(target.aircraft) * 65 +
    toNumber(target.ships) * 140;
  const passiveIncomeEstimate = cityCount * clamp(hoursInactive, 24, 240) * 11_500;
  const marketBias =
    toNumber(prices?.aluminum) * 24 +
    toNumber(prices?.steel) * 20 +
    toNumber(prices?.gasoline) * 12;
  const estimatedLoot = Math.max(
    0,
    passiveIncomeEstimate + marketBias - militaryDrag
  );
  const confidence = clamp((hoursInactive - 18) / 84, 0.2, 0.85);

  return {
    estimatedLoot: round(estimatedLoot, 0),
    confidence: round(confidence, 2),
    hoursInactive: round(hoursInactive, 1),
    reason:
      "No direct raid evidence. Inactivity and city profile suggest a possible stockpile. Run espionage before declaring.",
  };
}

function emptyLootModel(reason) {
  return {
    estimatedLoot: 0,
    sampleSize: 0,
    confidence: 0,
    averageLootPerHit: 0,
    lastBeigeValue: 0,
    defensiveWars: 0,
    reasons: [reason],
  };
}
