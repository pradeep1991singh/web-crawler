/* eslint-disable */

const puppeteer = require('puppeteer');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { getReviewsFromFacebook } = require('../crawler/facebook');
const { getReviewsFromYelp } = require('../crawler/yelp');
const { getReviewsFromGlassdoor } = require('../crawler/glassdoor');

class ReviewService {
  constructor(sourceName, getReviewSource) {
    this.sourceName = sourceName;
    this.getReviewService = getReviewSource;
  }

  async getAggregatedReviews(sourceURL, filterDate) {
    return await this.getReviewService(sourceURL, filterDate);
  }
}

const getReviewSource = (sourceName) => {
  switch (sourceName) {
    case 'yelp':
      return new ReviewService('yelp', getReviewsFromYelp);
    case 'glassdoor':
      return new ReviewService('glassdoor', getReviewsFromGlassdoor);
    case 'facebook':
      return new ReviewService('facebook', getReviewsFromFacebook);
    default:
      return new ReviewService('yelp', getReviewsFromYelp);
  }
};

module.exports = {
  getReviewSource,
};
