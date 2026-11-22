import { extractFeaturesForLocation } from './featureExtractor.js';

/**
 * Baseline Rule-Based Safety Risk Engine.
 * Note: Transparently documented as a baseline scoring algorithm.
 * Formula yields a Safety Index (0 to 100), where 100 is optimal reported safety,
 * and classifies risk into standard categories without claiming absolute guarantees.
 */
export const calculateSafetyRisk = (lat, lng, incidents = [], referenceTime = new Date()) => {
  const features = extractFeaturesForLocation(lat, lng, incidents, referenceTime);

  // Baseline score starts at 95 (nominal baseline in populated area)
  let safetyScore = 95;

  // Penalize for incidents within 500m (high local impact)
  safetyScore -= Math.min(features.incidentsWithin500m * 12, 36);

  // Penalize for incidents within 1.5km
  safetyScore -= Math.min(features.incidentsWithin1500m * 4, 20);

  // Penalize for severe incidents
  safetyScore -= Math.min(features.cumulativeSeverityWeight * 3, 20);

  // Recency penalty
  safetyScore -= Math.min(features.recentIncidents30Days * 2, 10);

  // Night-time adjustment (historically higher reported vulnerability)
  if (features.isNight) {
    safetyScore -= 8;
  }

  // Ensure score stays bounded in [10, 98]
  const finalScore = Math.max(10, Math.min(98, Math.round(safetyScore)));

  let riskCategory = 'Lower Reported Risk';
  let badgeColor = 'green';
  let alertSummary = 'Fewer historical incidents reported nearby.';

  if (finalScore < 55) {
    riskCategory = 'Higher Reported Risk';
    badgeColor = 'red';
    alertSummary = 'Multiple recent safety or harassment incidents reported within 1.5 km.';
  } else if (finalScore < 75) {
    riskCategory = 'Moderate Reported Risk';
    badgeColor = 'amber';
    alertSummary = 'Moderate incident frequency. Maintain heightened vigilance.';
  }

  return {
    score: finalScore,
    category: riskCategory,
    badgeColor,
    summary: alertSummary,
    disclaimer: 'Safety scores are based on available incident reports and do not guarantee personal safety.',
    features,
    mlReady: true,
    engine: 'Rule-Based Baseline v1.0 (Ready for PyTorch/FastAPI integration)',
  };
};
