/**
 * Per-hour scoring: evaluate each configured factor, apply safety gates, and
 * combine the quality factors with a weighted geometric mean. A spot's hour
 * score is the best across its condition sets.
 */
import { GATE_SCORE, IMPORTANCE_WEIGHT } from './constants'
import { arcContains } from './circular'
import { factorScore, type FactorKind } from './factor'
import type {
  ConditionSet,
  DirectionFactor,
  FactorScore,
  ForecastHour,
  HourScore,
  LinearFactor,
} from './types'

/** One factor resolved against an hour, ready to fold into the mean. */
interface ActiveFactor {
  kind: FactorKind
  score: number
  weight: number
  gateFailed: boolean
}

function weightOf(factor: LinearFactor | DirectionFactor): number {
  return IMPORTANCE_WEIGHT[factor.importance ?? 'normal']
}

/**
 * Evaluate one condition set against one hour.
 * Order of factors is fixed so ties (e.g. weakest factor) are deterministic.
 */
function evaluateSet(
  set: ConditionSet,
  hour: ForecastHour,
): Omit<HourScore, 'time' | 'conditionSetIndex'> {
  const active: ActiveFactor[] = []

  // --- wind ---
  if (set.windSpeed) {
    active.push({
      kind: 'windSpeed',
      score: factorScore('windSpeed', set.windSpeed, hour.windSpeed),
      weight: weightOf(set.windSpeed),
      // Gate: below the usable minimum wind = not enough to sail.
      gateFailed: hour.windSpeed < set.windSpeed.usable.min,
    })
  }
  if (set.windDirection) {
    active.push({
      kind: 'windDirection',
      score: factorScore('windDirection', set.windDirection, hour.windDirection),
      weight: weightOf(set.windDirection),
      // Gate: outside the usable arc (e.g. dangerous offshore wind).
      gateFailed: !arcContains(set.windDirection.usable, hour.windDirection),
    })
  }
  if (set.gusts && hour.gusts != null) {
    active.push({
      kind: 'gusts',
      score: factorScore('gusts', set.gusts, hour.gusts),
      weight: weightOf(set.gusts),
      gateFailed: false,
    })
  }

  // --- waves (from the selected source) ---
  let missingWaveData = false
  const wantsWaves = set.waveHeight || set.waveDirection || set.wavePeriod
  if (wantsWaves) {
    const wave = hour.waves?.[set.waveSource ?? 'total']
    if (!wave || wave.height == null) {
      // Coastal cells can lack wave data; skip wave factors and flag it.
      missingWaveData = true
    } else {
      if (set.waveHeight) {
        active.push({
          kind: 'waveHeight',
          score: factorScore('waveHeight', set.waveHeight, wave.height),
          weight: weightOf(set.waveHeight),
          // Gate: above the usable maximum wave height = too big / unsafe.
          gateFailed: wave.height > set.waveHeight.usable.max,
        })
      }
      if (set.waveDirection && wave.direction != null) {
        active.push({
          kind: 'waveDirection',
          score: factorScore('waveDirection', set.waveDirection, wave.direction),
          weight: weightOf(set.waveDirection),
          gateFailed: false,
        })
      }
      if (set.wavePeriod && wave.period != null) {
        active.push({
          kind: 'wavePeriod',
          score: factorScore('wavePeriod', set.wavePeriod, wave.period),
          weight: weightOf(set.wavePeriod),
          gateFailed: false,
        })
      }
    }
  }

  const factors: FactorScore[] = active.map((f) => ({
    factor: f.kind,
    score: f.score,
    ...(f.gateFailed ? { gateFailed: true } : {}),
  }))

  if (active.length === 0) {
    // Nothing to evaluate (e.g. all factors unset or wave data missing).
    return { score: 0, gated: false, factors, missingWaveData }
  }

  // Weighted geometric mean: exp(sum(w*ln(s)) / sum(w)).
  let logSum = 0
  let weightSum = 0
  let weakest = active[0]
  for (const f of active) {
    logSum += f.weight * Math.log(f.score)
    weightSum += f.weight
    if (f.score < weakest.score) weakest = f
  }
  const quality = Math.exp(logSum / weightSum)
  const gated = active.some((f) => f.gateFailed)

  return {
    score: gated ? GATE_SCORE : quality,
    gated,
    factors,
    weakestFactor: weakest.kind,
    missingWaveData,
  }
}

/**
 * Best hour score across a spot's condition sets. The winning set is the
 * highest-scoring one; an hour is only gated if every set gates it.
 */
export function scoreHour(
  conditionSets: ConditionSet[],
  hour: ForecastHour,
): HourScore {
  let best: HourScore | null = null
  for (let i = 0; i < conditionSets.length; i++) {
    const evaluated = evaluateSet(conditionSets[i], hour)
    const candidate: HourScore = {
      time: hour.time,
      conditionSetIndex: i,
      ...evaluated,
    }
    if (!best || candidate.score > best.score) best = candidate
  }
  // A spot always has at least one condition set in practice; fall back to a
  // zero hour so the function is total.
  return (
    best ?? {
      time: hour.time,
      score: 0,
      gated: false,
      conditionSetIndex: 0,
      factors: [],
    }
  )
}
