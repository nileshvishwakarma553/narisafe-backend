import { calculateHaversineDistance } from '../utils/geoUtils.js';

/**
 * Extracts spatio-temporal and environmental features from incident data and locations.
 * Future ML models (RandomForest, LightGBM, Spatial Graph Neural Nets) require this feature vector.
 */
export const extractFeaturesForLocation = (lat, lng, incidents = [], referenceTime = new Date()) => {
  const date = new Date(referenceTime);
  const hour = date.getHours();
  const dayOfWeek = date.getDay(); // 0 = Sun, 6 = Sat
  const isNight = hour >= 20 || hour < 6;
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Spatial radii (in kilometers)
  const RADIUS_NEAR = 0.5; // 500 meters
  const RADIUS_MID = 1.5;  // 1.5 km
  const RADIUS_FAR = 3.0;  // 3.0 km

  let countNear = 0;
  let countMid = 0;
  let countFar = 0;

  let severityScoreSum = 0;
  let recentIncidentsCount = 0;
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const nowMs = date.getTime();

  for (const inc of incidents) {
    if (!inc.latitude || !inc.longitude) continue;
    const dist = calculateHaversineDistance(lat, lng, inc.latitude, inc.longitude);

    if (dist <= RADIUS_NEAR) countNear++;
    if (dist <= RADIUS_MID) countMid++;
    if (dist <= RADIUS_FAR) countFar++;

    if (dist <= RADIUS_MID) {
      // Weight by severity
      const weights = { low: 1, medium: 2, high: 3.5, critical: 5 };
      const w = weights[inc.severity] || 2;
      severityScoreSum += w;

      // Recency check
      const incTime = new Date(inc.createdAt || inc.incidentTime || nowMs).getTime();
      if (nowMs - incTime <= THIRTY_DAYS_MS) {
        recentIncidentsCount++;
      }
    }
  }

  return {
    latitude: Number(lat.toFixed(6)),
    longitude: Number(lng.toFixed(6)),
    hourOfDay: hour,
    dayOfWeek,
    isNight,
    isWeekend,
    incidentsWithin500m: countNear,
    incidentsWithin1500m: countMid,
    incidentsWithin3000m: countFar,
    cumulativeSeverityWeight: severityScoreSum,
    recentIncidents30Days: recentIncidentsCount,
    extractedAt: date.toISOString(),
  };
};
