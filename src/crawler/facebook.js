const puppeteer = require('puppeteer');
const userAgents = require('./utils/userAgent');
const createLimiter = require('./utils/rateLimiter');

const limiter = createLimiter(60000);

async function getReviewsFromFacebook(sourceURL, filterDate) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const userAgent = await userAgents.rotateUserAgent();
  await page.setUserAgent(userAgent);

  await limiter.schedule(() => page.goto(sourceURL, { waitUntil: 'networkidle0' }));

  const title = await page.title();
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
              elem = { rating, review_date: reviewDate, reviewer_name: reviewName, comment };
            }
          } else {
            if (el.querySelector('h2 a')) {
              reviewName = el.querySelector('h2 a').textContent;
            }

            if (el.querySelector('[data-ad-comet-preview="message"]')) {
              comment = el.querySelector('[data-ad-comet-preview="message"]').textContent;
            }
            elem = { rating, review_date: reviewDate, reviewer_name: reviewName, comment };
          }
          return elem;
        })
        .filter(Boolean);
    },
    filterDate
  );

  const response = {
    title,
    overall_rating: overallRating,
    review_count: overallReviewCount,
    aggregated_reviews: reviews,
    review_aggregated_count: reviews.length,
    response_code: 200,
  };

  await browser.close();

  return response;
}

module.exports = {
  getReviewsFromFacebook,
};
