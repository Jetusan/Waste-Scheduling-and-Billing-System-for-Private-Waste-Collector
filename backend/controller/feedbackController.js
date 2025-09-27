const feedbackModel = require('../models/feedbackModel');

// Create a new feedback
const createFeedback = async (req, res) => {
  try {
    const { user_id, rating, feedback_text, category } = req.body;

    // Validation
    if (!user_id || !rating) {
      return res.status(400).json({ 
        error: 'User ID and rating are required' 
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        error: 'Rating must be between 1 and 5' 
      });
    }

    const newFeedback = await feedbackModel.createFeedback({
      user_id,
      rating,
      feedback_text,
      category
    });

    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedback: newFeedback
    });
  } catch (err) {
    console.error('Error creating feedback:', err);
    res.status(500).json({ 
      error: 'Failed to submit feedback', 
      details: err.message 
    });
  }
};

// Get all feedback (admin only)
const getAllFeedback = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const feedback = await feedbackModel.getAllFeedback(
      status, 
      parseInt(limit), 
      parseInt(offset)
    );

    res.json({
      feedback,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: feedback.length
      }
    });
  } catch (err) {
    console.error('Error fetching feedback:', err);
    res.status(500).json({ 
      error: 'Failed to fetch feedback', 
      details: err.message 
    });
  }
};

// Get feedback by user
const getFeedbackByUser = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const feedback = await feedbackModel.getFeedbackByUser(user_id);
    res.json(feedback);
  } catch (err) {
    console.error('Error fetching user feedback:', err);
    res.status(500).json({ 
      error: 'Failed to fetch user feedback', 
      details: err.message 
    });
  }
};

// Get feedback by ID
const getFeedbackById = async (req, res) => {
  try {
    const { feedback_id } = req.params;

    const feedback = await feedbackModel.getFeedbackById(feedback_id);
    
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.json(feedback);
  } catch (err) {
    console.error('Error fetching feedback:', err);
    res.status(500).json({ 
      error: 'Failed to fetch feedback', 
      details: err.message 
    });
  }
};

// Update feedback (admin only)
const updateFeedback = async (req, res) => {
  try {
    const { feedback_id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.feedback_id;
    delete updates.user_id;
    delete updates.created_at;

    const updatedFeedback = await feedbackModel.updateFeedback(feedback_id, updates);
    
    if (!updatedFeedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.json({
      message: 'Feedback updated successfully',
      feedback: updatedFeedback
    });
  } catch (err) {
    console.error('Error updating feedback:', err);
    res.status(500).json({ 
      error: 'Failed to update feedback', 
      details: err.message 
    });
  }
};

// Delete feedback
const deleteFeedback = async (req, res) => {
  try {
    const { feedback_id } = req.params;

    const deletedFeedback = await feedbackModel.deleteFeedback(feedback_id);
    
    if (!deletedFeedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.json({
      message: 'Feedback deleted successfully',
      feedback: deletedFeedback
    });
  } catch (err) {
    console.error('Error deleting feedback:', err);
    res.status(500).json({ 
      error: 'Failed to delete feedback', 
      details: err.message 
    });
  }
};

// Get feedback statistics
const getFeedbackStats = async (req, res) => {
  try {
    const stats = await feedbackModel.getFeedbackStats();
    
    // Format the statistics for better readability
    const formattedStats = {
      total_feedback: parseInt(stats.total_feedback),
      average_rating: parseFloat(stats.average_rating).toFixed(2),
      status_breakdown: {
        pending: parseInt(stats.pending_count),
        reviewed: parseInt(stats.reviewed_count),
        resolved: parseInt(stats.resolved_count)
      },
      rating_breakdown: {
        five_star: parseInt(stats.five_star_count),
        four_star: parseInt(stats.four_star_count),
        three_star: parseInt(stats.three_star_count),
        two_star: parseInt(stats.two_star_count),
        one_star: parseInt(stats.one_star_count)
      }
    };

    res.json(formattedStats);
  } catch (err) {
    console.error('Error fetching feedback stats:', err);
    res.status(500).json({ 
      error: 'Failed to fetch feedback statistics', 
      details: err.message 
    });
  }
};

module.exports = {
  createFeedback,
  getAllFeedback,
  getFeedbackByUser,
  getFeedbackById,
  updateFeedback,
  deleteFeedback,
  getFeedbackStats
};
