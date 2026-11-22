import Incident from '../models/Incident.js';
import { calculateHaversineDistance } from '../utils/geoUtils.js';

// Helper to seed localized sample incidents around user coordinates if no incidents exist in the city
const ensureLocalizedIncidents = async (lat, lng) => {
  const allIncidents = await Incident.find({
    status: { $in: ['submitted', 'under_review', 'verified'] },
  }).lean();

  const nearby = allIncidents.filter(
    (inc) => inc.latitude && inc.longitude && calculateHaversineDistance(lat, lng, inc.latitude, inc.longitude) <= 25
  );

  if (nearby.length === 0) {
    // Generate 4 localized safety incidents around user's active city
    const localSeeds = [
      {
        incidentType: 'Harassment',
        description: 'Verbal harassment and catcalling reported near pedestrian subway crossing after dark.',
        locationName: 'Main Transit Junction & Commercial Crossroad',
        latitude: Number((lat + 0.0072).toFixed(6)),
        longitude: Number((lng + 0.0055).toFixed(6)),
        severity: 'high',
        status: 'verified',
        anonymous: true,
      },
      {
        incidentType: 'Poor Lighting',
        description: 'Street lighting completely non-functional along a 300-meter stretch behind commercial complex.',
        locationName: 'Service Ring Road, Sector Avenue',
        latitude: Number((lat - 0.0084).toFixed(6)),
        longitude: Number((lng + 0.0068).toFixed(6)),
        severity: 'medium',
        status: 'verified',
        anonymous: true,
      },
      {
        incidentType: 'Suspicious Activity',
        description: 'Unidentified individuals loitering near unlit ATM kiosk obstructing pedestrian walkway.',
        locationName: 'Commercial Market Block B',
        latitude: Number((lat - 0.0055).toFixed(6)),
        longitude: Number((lng - 0.0078).toFixed(6)),
        severity: 'low',
        status: 'under_review',
        anonymous: false,
      },
      {
        incidentType: 'Stalking',
        description: 'Suspicious individual on scooter following pedestrian walking towards residential block.',
        locationName: 'Residential Sector 3 Link Road',
        latitude: Number((lat + 0.0115).toFixed(6)),
        longitude: Number((lng - 0.0062).toFixed(6)),
        severity: 'critical',
        status: 'verified',
        anonymous: true,
      },
    ];

    try {
      await Incident.insertMany(localSeeds);
    } catch (e) {
      console.warn('Auto-seed localized incidents notice:', e.message);
    }
  }
};

// @desc    Report a safety incident
// @route   POST /api/incidents
export const createIncident = async (req, res) => {
  try {
    const {
      incidentType,
      description,
      locationName,
      latitude,
      longitude,
      severity,
      anonymous,
      incidentTime,
      attachmentUrl,
    } = req.body;

    if (!incidentType || !description || !locationName || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide incident type, description, location landmark, and GPS coordinates.',
      });
    }

    const incident = await Incident.create({
      reporterId: anonymous ? null : req.user ? req.user._id : null,
      incidentType,
      description,
      locationName,
      latitude: Number(latitude),
      longitude: Number(longitude),
      severity: severity || 'medium',
      anonymous: !!anonymous,
      incidentTime: incidentTime || new Date(),
      attachmentUrl: attachmentUrl || '',
      status: 'submitted',
    });

    res.status(201).json({
      success: true,
      data: incident,
      message: 'Incident reported successfully. Thank you for contributing to community safety.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all active/verified incidents (public / map layer)
// @route   GET /api/incidents
export const getIncidents = async (req, res) => {
  try {
    const { type, severity, status, lat, lng, limit } = req.query;

    // If user's latitude & longitude provided, ensure localized hazards exist in their city
    if (lat && lng) {
      await ensureLocalizedIncidents(parseFloat(lat), parseFloat(lng));
    }

    const query = {};
    if (type) query.incidentType = type;
    if (severity) query.severity = severity;
    if (status) {
      query.status = status;
    } else {
      query.status = { $in: ['submitted', 'under_review', 'verified'] };
    }

    let incidents = await Incident.find(query)
      .select('-adminNotes')
      .populate('reporterId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit ? parseInt(limit, 10) : 100)
      .lean();

    // If user coordinates provided, prioritize incidents closer to the user
    if (lat && lng) {
      const uLat = parseFloat(lat);
      const uLng = parseFloat(lng);
      incidents.sort((a, b) => {
        const distA = calculateHaversineDistance(uLat, uLng, a.latitude, a.longitude);
        const distB = calculateHaversineDistance(uLat, uLng, b.latitude, b.longitude);
        return distA - distB;
      });
    }

    // Sanitize anonymous records to protect user privacy
    const sanitized = incidents.map((inc) => {
      const doc = { ...inc };
      if (doc.anonymous || !doc.reporterId) {
        doc.reporterId = null;
        doc.reporterName = 'Anonymous Citizen';
      } else {
        doc.reporterName = doc.reporterId?.name || 'Registered Citizen';
      }
      return doc;
    });

    res.status(200).json({ success: true, count: sanitized.length, data: sanitized });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current user's submitted incident reports
// @route   GET /api/incidents/my-reports
export const getMyReports = async (req, res) => {
  try {
    const reports = await Incident.find({ reporterId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: reports.length, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get incident by ID
// @route   GET /api/incidents/:id
export const getIncidentById = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id).populate('reporterId', 'name email');

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident report not found.' });
    }

    const doc = incident.toObject();
    if (doc.anonymous && req.user.role !== 'admin') {
      doc.reporterId = null;
    }

    res.status(200).json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update incident details (for reporter before verification)
// @route   PUT /api/incidents/:id
export const updateIncident = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found.' });
    }

    const isReporter = incident.reporterId && incident.reporterId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isReporter && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized to update this report.' });
    }

    const { description, incidentType, severity, locationName } = req.body;
    if (description) incident.description = description;
    if (incidentType) incident.incidentType = incidentType;
    if (severity) incident.severity = severity;
    if (locationName) incident.locationName = locationName;

    await incident.save();

    res.status(200).json({ success: true, data: incident, message: 'Incident report updated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
