const puppeteer = require('puppeteer');
const userAgents = require('./utils/userAgent');
const createLimiter = require('./utils/rateLimiter');
const logger = require('../config/logger');

const limiter = createLimiter(60000);

async function getReviewsFromGlassdoor(sourceURL, filterDate) {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized'],
  });
  const page = await browser.newPage();

  const userAgent = await userAgents.rotateUserAgent();
  await page.setUserAgent(userAgent);

  await limiter.schedule(() => page.goto(sourceURL, { waitUntil: ['load', 'networkidle0'] }));

  try {
    await page.waitForSelector('#SignInButton');
    await page.click('#SignInButton');
    logger.info('sign in button clicked');

    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'pradeep1991singh+test2024@gmail.com');
    logger.info('email entered');

    await page.click('[data-test="email-form-button"]');
    await page.waitForSelector('input[type="password"]');
    await page.type('input[type="password"]', 'Test2025@4321');
    logger.info('password entered');

    await page.click('button[type="submit"]');

    const closeButton = await page.$('.ContentSection .CloseButton');
    if (closeButton) {
      await page.waitForTimeout(2000);
      await closeButton.click();
      logger.info('close button clicked');
      await page.waitForTimeout(2000);
      logger.info('wait for navigation completed');
    }
  } catch (newError) {
    logger.info(newError.message);
  } finally {
  }
  // }

  const title = await page.title();

  logger.info('wait for profile selector');
  await page.waitForSelector('[aria-label="profile"]');
  const overallReviewCount = await page.$eval('[data-test=ei-nav-reviews-link]', (el) => parseInt(el.innerText, 10));

  let overallRating = 0;
  try {
    overallRating = await page.$eval('.v2__EIReviewsRatingsStylesV2__ratingNum', (el) => el.innerText);
  } catch (error) {
    logger.info('.v2__EIReviewsRatingsStylesV2__ratingNum not found, trying next selector');
  }

  if (!overallRating) {
    try {
      overallRating = await page.$eval('[data-test=rating-headline] div p', (el) => el.innerText);
    } catch (error) {
      logger.info('[data-test=rating-headline] div p not found');
    }
  }

  const allReviews = [];
  let ctr = 0;
  async function getReviews() {
    try {
      const reviews = await limiter.schedule(() =>
        page.$$eval(
          '#ReviewsFeed .empReviews li',
          // eslint-disable-next-line
          (elements, filterDate) => {
            return elements
              .map((el) => {
                let elem = null;
                const reviewDate = el.querySelector('.review-details__review-details-module__reviewDate').innerText;
                if (filterDate) {
                  if (new Date(reviewDate) >= new Date(filterDate)) {
                    const rating = el.querySelector('.review-details__review-details-module__overallRating').innerText;
                    const reviewName = el.querySelector('.review-details__review-details-module__employee').innerText;
                    const commentTitle = el.querySelector('.review-details__review-details-module__titleHeadline').innerText;
                    const comment = el.querySelector('.contentContainer').innerText;
                    elem = { rating, review_date: reviewDate, reviewer_name: reviewName, commentTitle, comment };
                  }
                } else {
                  const rating = el.querySelector('.review-details__review-details-module__overallRating').innerText;
                  const reviewName = el.querySelector('.review-details__review-details-module__employee').innerText;
                  const commentTitle = el.querySelector('.review-details__review-details-module__titleHeadline').innerText;
                  const comment = el.querySelector('.contentContainer').innerText;
                  elem = { rating, review_date: reviewDate, reviewer_name: reviewName, commentTitle, comment };
                }
                return elem;
              })
              .filter(Boolean);
          },
          filterDate
        )
      );

      logger.info(JSON.stringify(reviews));
      allReviews.push(...reviews);

      // test for 2 pages only
      // if (ctr < 2) {
      // Check if the next button is disabled
      const isDisabled = await page.$eval('.pageContainer .nextButton', (button) => button.disabled);
      if (!isDisabled) {
        await page.click('.pageContainer .nextButton');
        // ctr += 1;
        await getReviews();
      }
      // }
    } catch (error) {
      logger.error(error);
    }
  }

  await getReviews();

  const response = {
    title,
    overall_rating: overallRating,
    review_count: overallReviewCount,
    aggregated_reviews: allReviews,
    review_aggregated_count: allReviews.length,
    response_code: 200,
  };

  await browser.close();

  return response;
}

module.exports = {
  getReviewsFromGlassdoor,
};
