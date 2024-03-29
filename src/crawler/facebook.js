const puppeteer = require('puppeteer');
const userAgents = require('./utils/userAgent');
const createLimiter = require('./utils/rateLimiter');
const logger = require('../config/logger');

const limiter = createLimiter(60000);

async function getReviewsFromFacebook(sourceURL, filterDate) {
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null, args: ['--start-maximized'] });
  const page = await browser.newPage();

  const userAgent = await userAgents.rotateUserAgent();
  await page.setUserAgent(userAgent);

  await limiter.schedule(() => page.goto(sourceURL, { waitUntil: 'networkidle0' }));

  const title = await page.title();

  // Check if the element with aria-label="Close" exists
  const closeButton = await page.$('[aria-label="Close"]');
  if (closeButton) {
    // Click the element with aria-label="Close"
    await page.click('[aria-label="Close"]');
  }

  const overallReviewCount = await page.$eval('[role="main"] h2', (el) => parseFloat(el.textContent.split('(')[0], 10));
  const overallRating = await page.$eval('[role="main"] h2', (el) =>
    parseFloat(el.textContent.split('(')[0].split('·')[1], 10)
  );

  // // Fill in the email and password fields
  // await page.type('#email', 'pradeep1991singh@gmail.com');
  // await page.type('#pass', '1231bc');

  // // Click the login button
  // await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }), page.click('#loginbutton')]);

  // // Wait for the link to appear
  // await page.waitForXPath("//*[text()='Didn't receive a code?']");

  // // Click the link
  // const link = await page.$x("//*[text()='Didn't receive a code?']");
  // await link[0].click();

  // document.querySelectorAll('[role="main"] [role="article"]').forEach((el) => {
  //   if (el.querySelector('h2 a')) {
  //     console.log(el.querySelector('h2 a').textContent);
  //   }
  //   if (el.querySelector('[data-ad-comet-preview="message"]')) {
  //     console.log(el.querySelector('[data-ad-comet-preview="message"]').textContent);
  //   }
  // });

  const allReviews = [];
  let ctr = 0;

  async function getReviews() {
    try {
      const reviews = await page.$$eval(
        '[role="main"] [role="article"]',
        // eslint-disable-next-line
        (elements, filterDate) => {
          return elements
            .map((el) => {
              let reviewName = '';
              const rating = 0;
              let comment = '';
              let reviewDate = '';

              let elem = null;
              if (el.querySelector('a[role="link"]')) {
                const ariaLabel = el.querySelector('a[role="link"]').getAttribute('aria-label');
                const date = new Date(ariaLabel);
                if (!Number.isNaN(date.getTime())) {
                  reviewDate = ariaLabel;
                }
              }
              if (filterDate) {
                if (new Date(reviewDate) >= new Date(filterDate)) {
                  if (el.querySelector('h2 a')) {
                    reviewName = el.querySelector('h2 a').textContent;
                  }

                  if (el.querySelector('[data-ad-comet-preview="message"]')) {
                    comment = el.querySelector('[data-ad-comet-preview="message"]').textContent;
                  }

                  if (comment.trim() !== '') {
                    elem = { rating, review_date: reviewDate, reviewer_name: reviewName, comment };
                  }
                }
              } else {
                if (el.querySelector('h2 a')) {
                  reviewName = el.querySelector('h2 a').textContent;
                }

                if (el.querySelector('[data-ad-comet-preview="message"]')) {
                  comment = el.querySelector('[data-ad-comet-preview="message"]').textContent;
                }

                if (comment.trim() !== '') {
                  elem = { rating, review_date: reviewDate, reviewer_name: reviewName, comment };
                }
              }
              return elem;
            })
            .filter(Boolean);
        },
        filterDate
      );

      logger.info(JSON.stringify(reviews));
      allReviews.push(...reviews);

      // test for 2 pages only
      // disable for production
      // if (ctr < 2) {
      //   ctr += 1;
      // Scroll to the bottom of the page
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      // Wait for 100ms
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Call getReviews recursively

      await getReviews();
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
  getReviewsFromFacebook,
};
