import { calculateSafetyRisk } from './safetyRiskEngine.js';
import axios from 'axios';

/**
 * ML Service Adapter
 * Seamlessly switches between the local rule-based baseline and an external
 * Python FastAPI microservice (e.g. running XGBoost or PyTorch spatial models)
 * without requiring any frontend or controller changes.
 */
class MLServiceAdapter {
  constructor() {
    this.externalServiceUrl = process.env.ML_SERVICE_URL || null;
    this.isExternalActive = false;
  }

  async predictSafetyRisk(latitude, longitude, incidents = [], referenceTime = new Date()) {
    if (this.externalServiceUrl) {
      try {
        const response = await axios.post(`${this.externalServiceUrl}/predict-risk`, {
          latitude,
          longitude,
          referenceTime,
        }, { timeout: 2000 });
        
        return {
          ...response.data,
          source: 'fastapi-ml-model',
        };
      } catch (err) {
        console.warn(`[ML Adapter] External ML service failed (${err.message}). Falling back to local baseline engine.`);
      }
    }

    // Default: Clean rule-based baseline
    const result = calculateSafetyRisk(latitude, longitude, incidents, referenceTime);
    return {
      ...result,
      source: 'baseline-rule-engine',
    };
  }
}

export const mlAdapter = new MLServiceAdapter();
export default mlAdapter;
