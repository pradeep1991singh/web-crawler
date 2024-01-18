const puppeteer = require('puppeteer');
const userAgents = require('./utils/userAgent');
const createLimiter = require('./utils/rateLimiter');
const logger = require('../config/logger');

const limiter = createLimiter(60000);

async function getReviewsFromYelp(sourceURL, filterDate) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const userAgent = await userAgents.rotateUserAgent();
  await page.setUserAgent(userAgent);

  await limiter.schedule(() => page.goto(sourceURL, { waitUntil: 'networkidle0', timeout: 100000 }));

  const title = await page.title();
  // const overallReviewCount = await page.$eval('[data-testid=review-summary]', (el) => el.textContent);
  // const overallRating = await page.$eval('div[data-testid=review-summary] div[aria-label$=" star rating"]', (el) =>
  //   parseFloat(el.getAttribute('aria-label'), 10)
  // );

  const allReviews = [];
  let ctr = 0;

  async function getReviews() {
    try {
      const reviews = await limiter.schedule(() =>
        page.$$eval(
          '#reviews > section > div.css-1qn0b6x > ul',
          // eslint-disable-next-line
          (elements, filterDate) => {
            return elements
              .map((el) => {
                let elem = null;
                const userPassport = el.querySelector('.user-passport-info span');
                let reviewName = '';
                let rating = 0;
                let comment = '';
                let reviewDate = '';
                if (userPassport) {
                  reviewDate = el.querySelector('div div.arrange-unit:nth-child(2) span').textContent;
                  if (filterDate) {
                    if (new Date(reviewDate) >= new Date(filterDate)) {
                      reviewName = userPassport.textContent;
                      rating = parseFloat(
                        el.querySelector('div[aria-label$=" star rating"]').getAttribute('aria-label'),
                        10
                      );

                      const childElements = Array.from(el.querySelectorAll('p'));
                      comment = childElements.find((ell) =>
                        Array.from(ell.classList).some((cls) => cls.startsWith('comment__'))
                      ).textContent;

                      elem = { rating, review_date: reviewDate, reviewer_name: reviewName, comment };
                    }
                  } else {
                    reviewName = userPassport.textContent;
                    rating = parseFloat(el.querySelector('div[aria-label$=" star rating"]').getAttribute('aria-label'), 10);

                    const childElements = Array.from(el.querySelectorAll('p'));
                    comment = childElements.find((ell) =>
                      Array.from(ell.classList).some((cls) => cls.startsWith('comment__'))
                    ).textContent;

                    elem = { rating, review_date: reviewDate, reviewer_name: reviewName, comment };
                  }
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
      if (ctr < 2) {
        ctr += 1;

        // Select the element with aria-label="Pagination navigation"
        const paginationNav = await page.$('[aria-label="Pagination navigation"]');
        if (paginationNav) {
          // Find the a tag with aria-label="Next" and click it
          await page.$eval('[aria-label="Next"]', (nextButton) => nextButton.click(), paginationNav);
        }

        // Call getReviews recursively
        await getReviews();
      }
    } catch (error) {
      logger.error(error);
    }
  }

  await getReviews();

  const response = {
    title,
    // overall_rating: overallRating,
    // review_count: overallReviewCount,
    aggregated_reviews: allReviews,
    review_aggregated_count: allReviews.length,
    response_code: 200,
  };

  await browser.close();

  return response;
}

module.exports = {
  getReviewsFromYelp,
};
