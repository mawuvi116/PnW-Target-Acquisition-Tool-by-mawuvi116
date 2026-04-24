import { clamp, round, safeRatio } from "@/utils/calculations";

function ratioToScore(ratio, weight, floor = -weight) {
  const centered = (ratio - 1) * weight;
  return clamp(centered, floor, weight);
}

export function calculateWarScore(me, target) {
  const aircraftRatio = safeRatio(me.aircraft, target.aircraft);
  const tankRatio = safeRatio(me.tanks, target.tanks);
  const soldierRatio = safeRatio(me.soldiers, target.soldiers);
  const shipRatio = safeRatio(me.ships, target.ships);

  const aircraftScore = ratioToScore(aircraftRatio, 24, -24);
  const tankScore = ratioToScore(tankRatio, 22, -22);
  const soldierScore = ratioToScore(soldierRatio, 28, -28);
  const shipScore = ratioToScore(shipRatio, 8, -8);

  const total = round(
    aircraftScore +
      tankScore +
      soldierScore +
      shipScore,
    1
  );

  return {
    score: total,
    breakdown: {
      soldiers: round(soldierScore, 1),
      tanks: round(tankScore, 1),
      aircraft: round(aircraftScore, 1),
      ships: round(shipScore, 1),
    },
    estimates: estimateAttackSuccess(me, target),
  };
}

export function calculateProjectedAttackCost(me, target) {
  const groundPressure = safeRatio(
    target.soldiers + target.tanks * 22,
    me.soldiers + me.tanks * 22
  );
  const airPressure = safeRatio(target.aircraft, me.aircraft);

  let baseCost = 35_000;
  let attackStyle = "Soldiers only";

  if (groundPressure >= 0.25 && groundPressure < 0.55) {
    baseCost = 110_000;
    attackStyle = "Ground with munitions";
  } else if (groundPressure >= 0.55) {
    baseCost = 280_000;
    attackStyle = "Ground with tanks";
  }

  if (airPressure >= 0.9) {
    baseCost += 180_000;
    attackStyle = `${attackStyle} + air caution`;
  }

  if ((target.ships ?? 0) > 0 && (me.ships ?? 0) === 0) {
    baseCost += 35_000;
  }

  return {
    projectedAttackCost: round(baseCost, 0),
    attackStyle,
  };
}

export function calculateFinalScore({
  warScore,
  loot,
  risk,
  engine = "default",
  projectedAttackCost = 0,
  lootConfidence = 0,
  lastBeigeValue = 0,
}) {
  const projectedNetProfit = loot - projectedAttackCost;
  const normalizedNetProfit =
    clamp(projectedNetProfit / (engine === "advanced" ? 1_500_000 : 1_150_000), -0.75, 1.25) *
    (engine === "advanced" ? 72 : 66);
  const beigeBonus = clamp(lastBeigeValue / 2_000_000, 0, 1.2) * (engine === "advanced" ? 6 : 4);
  const confidenceBonus = clamp(lootConfidence, 0, 1) * (engine === "advanced" ? 5 : 3);
  const militaryWeight = engine === "advanced" ? 0.18 : 0.14;
  const riskWeight = engine === "advanced" ? 0.34 : 0.26;

  return round(
    normalizedNetProfit + warScore * militaryWeight + beigeBonus + confidenceBonus - risk * riskWeight,
    1
  );
}

function estimateAttackSuccess(me, target) {
  const groundPower =
    safeRatio(me.soldiers, target.soldiers) * 0.4 +
    safeRatio(me.tanks, target.tanks) * 0.45 +
    safeRatio(me.aircraft, target.aircraft) * 0.15;

  const airPower =
    safeRatio(me.aircraft, target.aircraft) * 0.8 +
    safeRatio(me.tanks, target.tanks) * 0.2;

  const navalPower =
    safeRatio(me.ships, target.ships) * 0.75 +
    safeRatio(me.aircraft, target.aircraft) * 0.25;

  return {
    ground: ratioToPercent(groundPower),
    air: ratioToPercent(airPower),
    naval: ratioToPercent(navalPower),
  };
}

function ratioToPercent(value) {
  const percent = 50 + (value - 1) * 38;
  return round(clamp(percent, 8, 95), 0);
}
