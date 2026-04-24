import { round, safeRatio } from "@/utils/calculations";
import { getHoursSinceActive } from "@/utils/timeUtils";

export function calculateRisk(target, me) {
  let risk = 0;
  const flags = [];
  const reasons = [];

  const hours = getHoursSinceActive(target.last_active);

  if (hours === Number.POSITIVE_INFINITY) {
    risk += 4;
    reasons.push("Activity timestamp unavailable");
  } else if (hours > 36) {
    risk -= 8;
    flags.push("SLEEPING");
    reasons.push("Long inactivity window");
  } else if (hours > 18) {
    risk -= 4;
    flags.push("QUIET");
    reasons.push("Moderately inactive");
  }

  if (hours < 1.5) {
    risk += 12;
    flags.push("VERY_ACTIVE");
    reasons.push("Recently active");
  } else if (hours < 6) {
    risk += 6;
    flags.push("ACTIVE");
    reasons.push("Active in the last few hours");
  } else if (hours < 12) {
    risk += 2;
    reasons.push("Potentially online soon");
  }

  if (target.defWars === 2) {
    flags.push("LAST_SLOT");
    reasons.push("Only one defensive slot left");
  }

  if (me) {
    const airParity = safeRatio(target.aircraft, me.aircraft);
    const shipParity = safeRatio(target.ships, me.ships);
    const groundParity = safeRatio(
      target.soldiers + target.tanks * 22,
      me.soldiers + me.tanks * 22
    );

    if (groundParity >= 1.05) {
      risk += 18;
      flags.push("GROUND_THREAT");
      reasons.push("Ground military can punish a sloppy raid");
    } else if (groundParity >= 0.8) {
      risk += 9;
      reasons.push("Ground forces are close enough to trade back");
    } else if (groundParity <= 0.3) {
      risk -= 5;
      reasons.push("Weak ground makes low-cost raiding easier");
    }

    if (airParity >= 1) {
      risk += 12;
      flags.push("AIR_THREAT");
      reasons.push("Air force can punish if the target logs in");
    } else if (airParity >= 0.8) {
      risk += 6;
      reasons.push("Air parity creates retaliation risk");
    }

    if (shipParity >= 1) {
      risk += 4;
      reasons.push("Naval parity slightly reduces safety");
    }
  }

  return {
    risk: round(risk, 1),
    flags,
    reasons,
  };
}
