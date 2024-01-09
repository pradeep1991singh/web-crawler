const puppeteer = require('puppeteer');
const userAgents = require('./utils/userAgent');
const createLimiter = require('./utils/rateLimiter');

const limiter = createLimiter(60000);

async function getReviewsFromYelp(sourceURL, filterDate) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const userAgent = await userAgents.rotateUserAgent();
  await page.setUserAgent(userAgent);

  await limiter.schedule(() => page.goto(sourceURL, { waitUntil: 'networkidle0' }));

  // await page.setRequestInterception(true);
  // page.on('request', (request) => {
  //   console.log('Request URL:', request.url());
  //   request.continue();
  // });

  // page.on('response', async (response) => {
  //   try {
  //     console.log('Response URL:', response.url());
  //     if (response.url().indexOf('/props?')) {
  //       console.log('Response data:', await response.json());
  //     }
  //   } catch (error) {
  //     console.error('Failed to get response data:', error);
  //   }
  // });

  const title = await page.title();
  const overallReviewCount = await page.$eval('[data-testid=review-summary]', (el) => el.textContent);

  const overallRating = await page.$eval('div[data-testid=review-summary] div[aria-label$=" star rating"]', (el) =>
    parseFloat(el.getAttribute('aria-label'), 10)
  );

  const reviews = await limiter.schedule(() =>
    page.$$eval(
      '#reviews ul li',
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
                  rating = parseFloat(el.querySelector('div[aria-label$=" star rating"]').getAttribute('aria-label'), 10);

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
  getReviewsFromYelp,
};

// const userPassport = el.querySelector('.user-passport-info span');
// let userPassportInfo = '';
// let starRating = 0;
// let comment = '';
// let date = '';
// if (userPassport) {
//   userPassportInfo = userPassport.textContent;
//   starRating = parseFloat(el.querySelector('div[aria-label$=" star rating"]').getAttribute('aria-label'), 10);

//   const childElements = Array.from(el.querySelectorAll('p'));
//   comment = childElements.find((ell) =>
//     Array.from(ell.classList).some((cls) => cls.startsWith('comment__'))
//   ).textContent;

//   date = el.querySelector('div div.arrange-unit:nth-child(2) span').textContent;
// }

// return {
//   rating: starRating,
//   reviewer_name: userPassportInfo,
//   review_date: date,
//   comment,
// };
