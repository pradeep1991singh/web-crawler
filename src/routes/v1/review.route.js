const express = require('express');
const validate = require('../../middlewares/validate');
const reviewValidation = require('../../validations');
const { reviewController } = require('../../controllers');

const router = express.Router();

router.post('/aggregate', validate(reviewValidation.aggregate), reviewController.aggregateReviews);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Review
 *   description: Review management and retrieval
 */

/**
 * @swagger
 * /reviews/aggregate:
 *   post:
 *     summary: Aggregate reviews
 *     tags: [Review]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sourceURL
 *               - sourceName
 *             properties:
 *               sourceURL:
 *                 type: string
 *                 description: The URL of the source to aggregate reviews from
 *               sourceName:
 *                 type: string
 *                 description: The name of the source
 *               filterDate:
 *                 type: string
 *                 description: The date to filter reviews by (optional)
 *             example:
 *               sourceURL: https://example.com/product1/reviews
 *               sourceName: example
 *               filterDate: 2020-05-01
 *     responses:
 *       "200":
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   review:
 *                     type: string
 *                     description: The review text
 *                   date:
 *                     type: string
 *                     description: The date of the review
 *       "500":
 *         description: Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: The error message
 */
