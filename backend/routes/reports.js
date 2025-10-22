const express = require('express');
const router = express.Router();
const ReportController = require('../controller/reportController');

// Get all reports
router.get('/', ReportController.getAllReports);

// Generate new report
router.post('/generate', ReportController.generateReport);

// Generate PDF directly from report data (for preview downloads)
router.post('/generate-pdf', ReportController.generateDirectPDF);

// Download report
router.get('/:id/download', ReportController.downloadReport);

// Delete report
router.delete('/:id', ReportController.deleteReport);

// Get dropdown data for filters
router.get('/barangays', (req, res) => ReportController.getBarangays(req, res));
router.get('/collectors', (req, res) => ReportController.getCollectors(req, res));
router.get('/trucks', (req, res) => ReportController.getTrucks(req, res));
router.get('/subdivisions', (req, res) => ReportController.getSubdivisions(req, res));
router.get('/teams', (req, res) => ReportController.getTeams(req, res));
router.get('/routes', (req, res) => ReportController.getRoutes(req, res));
router.get('/plans', (req, res) => ReportController.getPlans(req, res));
router.get('/waste-types', (req, res) => ReportController.getWasteTypes(req, res));

module.exports = router;
