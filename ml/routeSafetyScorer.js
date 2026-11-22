import { calculateSafetyRisk } from './safetyRiskEngine.js';
import { calculateHaversineDistance } from '../utils/geoUtils.js';

/**
 * Evaluates route segments and waypoints for comparative safety.
 * Analyzes route distance, duration, and safety incidents along the trajectory.
 */
export const scoreRouteSafety = (routeWaypoints = [], incidents = [], policeStations = []) => {
  if (!routeWaypoints || routeWaypoints.length === 0) {
    return {
      averageSafetyScore: 80,
      riskLevel: 'Moderate Reported Risk',
      incidentCountAlongRoute: 0,
      policeStationsAlongRoute: 0,
      disclaimer: 'Safety scores are based on available reports and do not guarantee personal safety.',
    };
  }

  // Sample up to 10 points along the route
  const sampleStep = Math.max(1, Math.floor(routeWaypoints.length / 8));
  const sampledPoints = routeWaypoints.filter((_, idx) => idx % sampleStep === 0);

  let totalScore = 0;
  const nearbyIncidentIds = new Set();
  const nearbyStationIds = new Set();

  sampledPoints.forEach((point) => {
    const risk = calculateSafetyRisk(point.lat, point.lng, incidents);
    totalScore += risk.score;

    // Check nearby incidents (within 400m of route)
    incidents.forEach((inc) => {
      if (inc._id && calculateHaversineDistance(point.lat, point.lng, inc.latitude, inc.longitude) <= 0.4) {
        nearbyIncidentIds.add(String(inc._id));
      }
    });

    // Check nearby police stations (within 800m of route)
    policeStations.forEach((station, sIdx) => {
      const sId = station.id || String(sIdx);
      if (calculateHaversineDistance(point.lat, point.lng, station.lat, station.lng) <= 0.8) {
        nearbyStationIds.add(sId);
      }
    });
  });

  const avgScore = Math.round(totalScore / sampledPoints.length);

  // Bonus if route passes near police stations
  const policeBonus = Math.min(nearbyStationIds.size * 3, 6);
  const adjustedScore = Math.max(15, Math.min(98, avgScore + policeBonus));

  let riskLevel = 'Lower Reported Risk';
  let badgeClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';

  if (adjustedScore < 55) {
    riskLevel = 'Higher Reported Risk';
    badgeClass = 'text-red-700 bg-red-50 border-red-200';
  } else if (adjustedScore < 75) {
    riskLevel = 'Moderate Reported Risk';
    badgeClass = 'text-amber-700 bg-amber-50 border-amber-200';
  }

  return {
    safetyScore: adjustedScore,
    riskLevel,
    badgeClass,
    incidentCountAlongRoute: nearbyIncidentIds.size,
    policeStationsAlongRoute: nearbyStationIds.size,
    evaluatedWaypointsCount: sampledPoints.length,
    disclaimer: 'Safety scores are based on available reports and do not guarantee personal safety.',
  };
};
