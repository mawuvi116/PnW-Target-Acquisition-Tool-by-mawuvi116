import { getPoliticalSafety } from "@/services/allianceMappingService";

export function filterTargets(
  me,
  nations,
  { includeUnsafe = false, allianceContext = null } = {}
) {
  const myAllianceId = me.alliance?.id ?? null;

  return nations.filter((nation) => {
    if (nation.id === me.id) return false;

    const targetAllianceId = nation.alliance?.id ?? null;
    const politicalSafety = getPoliticalSafety(targetAllianceId, allianceContext);

    if (myAllianceId && targetAllianceId === myAllianceId) return false;
    if (politicalSafety.isFriendly) return false;
    if ((nation.vacation_mode_turns ?? 0) > 0) return false;
    if ((nation.beige_turns ?? 0) > 0) return false;
    if (!includeUnsafe && politicalSafety.isUnsafe) return false;

    return true;
  });
}
