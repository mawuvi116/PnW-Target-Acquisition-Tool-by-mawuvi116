import { useMemo, useState } from "react";
import {
  BadgeDollarSign,
  Binoculars,
  Bomb,
  Building2,
  CircleDollarSign,
  CircleHelp,
  Crown,
  ExternalLink,
  Flame,
  HandCoins,
  Plane,
  Radar,
  Shield,
  ShieldAlert,
  Ship,
  Sparkle,
  Target,
  Triangle,
  TriangleAlert,
  UserRound,
  TimerReset,
  TowerControl,
} from "lucide-react";
import styles from "@/styles/war-targets.module.css";

const STAT_EXPLANATIONS = {
  finalScore:
    "The final score centers projected net profit, then adjusts for military ease, confidence from historical data, and retaliation risk.",
  loot: "Average observed loot from this target's completed defensive losses.",
  netProfit:
    "Projected net profit is the loot estimate minus a heuristic attack-cost model. It is a raid guide, not a combat simulator.",
  attackCost:
    "Attack cost estimates how expensive the raid path should be based on ground resistance, air pressure, and likely tank usage.",
  risk: "Raid risk focuses on ground resistance, air retaliation if the target logs in, and a lighter activity adjustment.",
  speculative:
    "Speculative Inactives are not evidence-backed loot targets. They look promising from inactivity and city profile, so espionage is recommended before declaring.",
  warScore:
    "War score is a quick read on military approachability. It is useful context, but not the primary raid ranking signal anymore.",
  troopCount:
    "Troop count shows the core military profile we can already pull from the API so you can quickly judge whether the raid path looks clean.",
  engine:
    "Default keeps the proven live behavior. Advanced leans harder into projected net profit and cleaner retaliation reads.",
  range:
    "2.50x follows the full game war range. 1.75x remains the safer recommended raid search range.",
};

export default function WarTargets() {
  const [nationId, setNationId] = useState("");
  const [mode, setMode] = useState("raid");
  const [engine, setEngine] = useState("default");
  const [rangeFactor, setRangeFactor] = useState(1.75);
  const [includeUnsafe, setIncludeUnsafe] = useState(false);
  const [targets, setTargets] = useState([]);
  const [speculativeTargets, setSpeculativeTargets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState(null);

  const summary = useMemo(() => {
    if (targets.length === 0) {
      return null;
    }

    return {
      topTarget: targets[0],
      averageNetProfit:
        targets.reduce((sum, target) => sum + target.projectedNetProfit, 0) /
        targets.length,
    };
  }, [targets]);

  async function fetchTargets() {
    if (!nationId || mode !== "raid") return;

    setLoading(true);
    setError("");
    setTargets([]);
    setSpeculativeTargets([]);

    try {
      const params = new URLSearchParams({
        nationId,
        engine,
        maxRangeFactor: String(rangeFactor),
        includeUnsafe: String(includeUnsafe),
      });
      const res = await fetch(`/api/targets?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unable to fetch targets");
      }

      setTargets(data.targets ?? []);
      setSpeculativeTargets(data.speculativeTargets ?? []);
      setMeta({
        count: data.count,
        evaluatedAt: data.evaluatedAt,
        targetRange: data.targetRange,
        engine: data.engine,
        political: data.political,
      });
    } catch (err) {
      setError(err.message);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroHeader}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>PnW War Finder v1.1</p>
            <h1 className={styles.title}>
              <span>Target Acquisition</span>
              <span className={styles.titleAccent}>Tool</span>
            </h1>
            <p className={styles.subtitle}>
              Built for raid-focused targeting with a faster, clearer scan.
              Find profitable nations, weigh risk instantly, and move with better intel.
            </p>
            <div className={styles.heroCallouts}>
              <HeroChip icon={Radar} label="Radar terminal UI" />
              <HeroChip icon={HandCoins} label="Profit-first scoring" />
              <HeroChip icon={Shield} label="Political safety filter" />
            </div>
          </div>

          <div className={styles.engineToggle}>
            <span className={styles.panelLabel}>Engine</span>
            <div className={styles.modeRow}>
              <ModeButton
                label="Default"
                active={engine === "default"}
                onClick={() => setEngine("default")}
              />
              <ModeButton
                label="Advanced"
                active={engine === "advanced"}
                onClick={() => setEngine("advanced")}
              />
            </div>
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelTop}>
            <div className={styles.modeRow}>
              <ModeButton
                label="Raid Mode"
                active={mode === "raid"}
                onClick={() => setMode("raid")}
              />
              <ModeButton
                label="War Mode"
                active={mode === "war"}
                onClick={() => setMode("war")}
              />
            </div>
          </div>

          {mode === "raid" ? (
            <>
              <div className={styles.inputRow}>
                <label className={styles.field}>
                  <div className={styles.fieldShell}>
                    <div className={styles.fieldInnerLabel}>Nation ID</div>
                    <div className={styles.fieldInputRow}>
                      <Target size={16} />
                      <input
                        value={nationId}
                        onChange={(event) => setNationId(event.target.value)}
                        placeholder="Enter Nation ID"
                        className={styles.input}
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                </label>

                <div className={styles.rangeCard}>
                  <div className={styles.inlineLabel}>
                    <span className={styles.controlLabel}>Max Target Range</span>
                    <span className={styles.rangeValue}>
                      {rangeFactor.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1.25"
                    max="2.5"
                    step="0.05"
                    value={rangeFactor}
                    onChange={(event) =>
                      setRangeFactor(Number(event.target.value))
                    }
                    className={styles.range}
                  />
                </div>

                <button
                  onClick={fetchTargets}
                  className={styles.button}
                  disabled={loading}
                >
                  <Radar size={16} />
                  {loading ? "Scanning..." : "Locate Targets"}
                </button>
              </div>

              <div className={styles.controlGrid}>
                <label className={`${styles.controlCard} ${styles.checkboxCard}`}>
                  <input
                    type="checkbox"
                    checked={includeUnsafe}
                    onChange={(event) => setIncludeUnsafe(event.target.checked)}
                  />
                  <div>
                    <span className={styles.controlLabel}>Show Unsafe Targets</span>
                    <p>
                      Hidden by default if they belong to a top 40 alliance or
                      are treaty-linked to one.
                    </p>
                  </div>
                </label>

                <div className={styles.controlCard}>
                  <div className={styles.inlineLabel}>
                    <span className={styles.controlLabel}>System Status</span>
                    <InfoTooltip text={STAT_EXPLANATIONS.engine} />
                  </div>
                  <p className={styles.controlDescription}>
                    Running on the default scoring system.
                    Advanced targeting logic is being refined and will be available soon.
                  </p>
                </div>
              </div>

              <div className={styles.helperText}>
                <InfoTooltip text={STAT_EXPLANATIONS.range} />
                <span>
                  2.50x follows the full game war range. 1.75x remains the safer
                  recommended raid search range.
                </span>
              </div>
            </>
          ) : (
            <div className={styles.warPlaceholder}>
              <TriangleAlert size={18} />
              <div>
                <strong>War Mode is not developed yet.</strong>
                <p>
                  This mode considers alliance mapping and treaty-context
                  and is aimed to expose hostile-alliance nations,
                  bloc detection, and best war-targets in globals.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {mode === "raid" && !loading && !error && targets.length === 0 && (
        <div className={styles.emptyState}>
          <Radar size={18} />
          <span>Enter your nation ID to populate the target queue.</span>
        </div>
      )}

      {summary && (
        <section className={styles.summaryGrid}>
          <Metric
            icon={HandCoins}
            label="Average projected net"
            value={formatCurrency(summary.averageNetProfit)}
          />
          <Metric
            icon={Radar}
            label="Targets evaluated"
            value={String(meta?.count ?? targets.length)}
          />
          <Metric
            icon={Crown}
            label="Best current target"
            value={summary.topTarget.name}
          />
          <Metric
            icon={TimerReset}
            label="Last Activity"
            value={formatTimeAgo(summary.topTarget.lastActive)}
          />
        </section>
      )}

      {meta && (
        <div className={styles.metaRow}>
          <span>
            War range: {meta.targetRange.minScore.toFixed(2)} to{" "}
            {meta.targetRange.maxScore.toFixed(2)} (
            {meta.targetRange.maxRangeFactor.toFixed(2)}x)
          </span>
          <span>Engine: {meta.engine}</span>
          <span>Updated {formatTimestamp(meta.evaluatedAt)}</span>
        </div>
      )}

      <div className={styles.layout}>
        <div className={styles.results}>
          {targets.map((target, index) => (
            <article
              key={target.id}
              className={`${styles.card} ${index === 0 ? styles.topCard : ""}`}
            >
              <div className={styles.cardTop}>
                <div>
                  <p className={styles.rank}>Rank #{index + 1}</p>
                  <h2 className={styles.cardTitle}>
                    <a
                      href={target.nationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.targetLink}
                    >
                      {target.name}
                      <ExternalLink size={16} />
                    </a>
                  </h2>
                  <p className={styles.cardSubtle}>{target.alliance}</p>
                </div>

                <div className={styles.scoreBlock}>
                  {target.isUnsafe ? (
                    <span className={styles.unsafeBadge}>Unsafe</span>
                  ) : null}
                  <div className={scoreBadgeClass(target.finalScore, styles)}>
                    {target.finalScore.toFixed(1)}
                  </div>
                  <InfoTooltip text={STAT_EXPLANATIONS.finalScore} />
                </div>
              </div>

              <div className={styles.primaryStats}>
                <Stat
                  icon={BadgeDollarSign}
                  label="Loot Estimate"
                  value={formatCurrency(target.loot)}
                  help={STAT_EXPLANATIONS.loot}
                  focus
                />
                <Stat
                  icon={CircleDollarSign}
                  label="Projected Net"
                  value={formatCurrency(target.projectedNetProfit)}
                  help={STAT_EXPLANATIONS.netProfit}
                  focus
                />
                <Stat
                  icon={ShieldAlert}
                  label="Risk"
                  value={target.risk.toFixed(1)}
                  help={STAT_EXPLANATIONS.risk}
                  focus
                />
              </div>

              <div className={styles.breakdownGrid}>
                <SectionCard title="Target Snapshot" help={STAT_EXPLANATIONS.warScore}>
                  <div className={styles.snapshotGrid}>
                    <SnapshotItem
                      icon={BadgeDollarSign}
                      label="Loot Estimate"
                      value={formatCurrency(target.loot)}
                    />
                    <SnapshotItem
                      icon={HandCoins}
                      label="Last Beige"
                      value={formatCurrency(target.lastBeigeValue)}
                    />
                    <SnapshotItem
                      icon={Building2}
                      label="Cities"
                      value={String(target.cities)}
                    />
                    <SnapshotItem
                      icon={Sparkle}
                      label="Score"
                      value={target.score.toFixed(2)}
                    />
                    <SnapshotItem
                      icon={TimerReset}
                      label="Last Active"
                      value={formatTimeAgo(target.lastActive)}
                    />
                    <SnapshotItem
                      icon={Flame}
                      label="Defensive Wars"
                      value={`${target.defWars}/3`}
                    />
                  </div>
                </SectionCard>

                <SectionCard title="Troop Count" help={STAT_EXPLANATIONS.troopCount}>
                  <div className={styles.troopGrid}>
                    <TroopStat
                      icon={UserRound}
                      label="Soldiers"
                      value={formatCompactNumber(target.soldiers)}
                    />
                    <TroopStat
                      icon={Shield}
                      label="Tanks"
                      value={formatCompactNumber(target.tanks)}
                    />
                    <TroopStat
                      icon={Plane}
                      label="Aircraft"
                      value={formatCompactNumber(target.aircraft)}
                    />
                    <TroopStat
                      icon={Ship}
                      label="Ships"
                      value={formatCompactNumber(target.ships)}
                    />
                    <TroopStat
                      icon={Binoculars}
                      label="Spies"
                      value={formatCompactNumber(target.spies)}
                    />
                    <TroopStat
                      icon={Triangle}
                      label="Missiles"
                      value={formatCompactNumber(target.missiles)}
                    />
                    <TroopStat
                      icon={Bomb}
                      label="Nukes"
                      value={formatCompactNumber(target.nukes)}
                    />
                  </div>
                </SectionCard>
              </div>

            </article>
          ))}
        </div>

        <aside className={styles.sidebar}>
          <div className={`${styles.sideCard} ${styles.focusCard}`}>
            <div className={styles.sectionHeader}>
              <h3>Speculative Inactives</h3>
              <InfoTooltip text={STAT_EXPLANATIONS.speculative} />
            </div>
            <p className={styles.sideText}>
              Flagged from inactivity patterns and city profiles. No confirmed
              loot evidence. Run espionage before committing.
            </p>
            <div className={styles.sideList}>
              {speculativeTargets.length ? (
                speculativeTargets.map((target) => (
                  <a
                    key={target.id}
                    href={target.nationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.sideItem}
                  >
                    <div className={styles.sideIdentity}>
                      <div className={styles.sideHeader}>
                        <TowerControl size={15} />
                        <div className={styles.sideIdentityText}>
                          <strong>{target.name}</strong>
                          <span>{target.alliance}</span>
                        </div>
                      </div>
                    </div>
                    <div className={styles.sideMeta}>
                      <strong>{formatCurrency(target.speculativeLoot)}</strong>
                      <span>{formatTimeAgo(target.lastActive)}</span>
                    </div>
                  </a>
                ))
              ) : (
                <div className={styles.sideEmpty}>No speculative targets yet.</div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function HeroChip({ icon: Icon, label }) {
  return (
    <div className={styles.heroChip}>
      <Icon size={14} />
      <span>{label}</span>
    </div>
  );
}

function ModeButton({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${styles.modeButton} ${active ? styles.modeActive : ""}`}
    >
      {label}
    </button>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className={styles.metricCard}>
      <Icon size={18} />
      <div>
        <span className={styles.metricLabel}>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, help, focus = false }) {
  return (
    <div className={`${styles.statCard} ${focus ? styles.focusCard : ""}`}>
      <div className={styles.statHeader}>
        <div className={styles.statTitle}>
          <Icon size={16} />
          <span className={styles.statLabel}>{label}</span>
        </div>
        {help ? <InfoTooltip text={help} /> : null}
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function SectionCard({ title, help, children, focus = false }) {
  return (
    <div className={`${styles.breakdownCard} ${focus ? styles.focusCard : ""}`}>
      <div className={styles.sectionHeader}>
        <h3>{title}</h3>
        {help ? <InfoTooltip text={help} /> : null}
      </div>
      {children}
    </div>
  );
}

function SnapshotItem({ icon: Icon, label, value }) {
  return (
    <div className={styles.snapshotItem}>
      <div className={styles.snapshotLabel}>
        <Icon size={14} />
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function TroopStat({ icon: Icon, label, value }) {
  return (
    <div className={styles.troopCard}>
      <div className={styles.troopLabel}>
        <Icon size={14} />
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function InfoTooltip({ text }) {
  return (
    <span className={styles.tooltip}>
      <button
        type="button"
        className={styles.tooltipButton}
        aria-label="More information"
      >
        <CircleHelp size={13} />
      </button>
      <span className={styles.tooltipBubble}>{text}</span>
    </span>
  );
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value || 0);
}

function formatTimestamp(value) {
  if (!value) return "just now";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatTimeAgo(date) {
  const diff = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60);

  if (!Number.isFinite(diff)) return "Unknown";
  if (diff < 1) return "Active now";
  if (diff < 24) return `${Math.floor(diff)}h ago`;
  return `${Math.floor(diff / 24)}d ago`;
}

function scoreBadgeClass(score, scopedStyles) {
  if (score >= 45) return `${scopedStyles.scoreBadge} ${scopedStyles.scoreGreat}`;
  if (score >= 20) return `${scopedStyles.scoreBadge} ${scopedStyles.scoreGood}`;
  if (score >= 0) return `${scopedStyles.scoreBadge} ${scopedStyles.scoreFair}`;
  return `${scopedStyles.scoreBadge} ${scopedStyles.scorePoor}`;
}
