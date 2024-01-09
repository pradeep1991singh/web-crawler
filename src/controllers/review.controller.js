const catchAsync = require('../utils/catchAsync');
const { getReviewSource } = require('../services/review.service');

const aggregateReviews = catchAsync(async (req, res) => {
  const { source_name: sourceName, source_url: sourceURL } = req.body;
  const filterDate = req.body.filter_date || null;
  try {
    const reviews = await getReviewSource(sourceName).getAggregatedReviews(sourceURL, filterDate);
    res.status(200).json(reviews);
  } catch (error) {
    res.status(400).json({ response_code: 400, error: { message: 'Network issue', error } });
  }
});

module.exports = {
  aggregateReviews,
};
