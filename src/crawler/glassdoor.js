const puppeteer = require('puppeteer');
const userAgents = require('./utils/userAgent');
const createLimiter = require('./utils/rateLimiter');

const limiter = createLimiter(60000);

// async function fetchReviews(page, pageIndex, sourceURL, reviews) {
//   const newReviews = await limiter.schedule(() =>
//     page.$$eval('#ReviewsFeed .empReviews li', (elements) =>
//       elements.map((el) => {
//         const rating = el.querySelector('.review-details__review-details-module__overallRating').innerText;
//         const reviewDate = el.querySelector('.review-details__review-details-module__reviewDate').innerText;
//         const reviewName = el.querySelector('.review-details__review-details-module__employee').innerText;
//         const comment = el.querySelector('.review-details__review-details-module__titleHeadline').innerText;

//         return { rating, review_date: reviewDate, reviewer_name: reviewName, comment };
//       })
//     )
//   );

//   if (newReviews.length > 1) {
//     const newPageIndex = pageIndex + 1;
//     const newBrowser = await puppeteer.launch({ headless: false });
//     const newPage = await newBrowser.newPage();
//     const userAgent = await userAgents.rotateUserAgent();
//     await page.setUserAgent(userAgent);
//     const pageURL =
//       newPageIndex > 1
//         ? `${sourceURL}_P${newPageIndex}.htm?sort.sortType=RD&sort.ascending=false&filter.iso3Language=eng`
//         : `${sourceURL}.htm?sort.sortType=RD&sort.ascending=false&filter.iso3Language=eng`;
//     await limiter.schedule(() => page.goto(pageURL, { waitUntil: 'networkidle0' }));

//     return fetchReviews(newPage, newPageIndex, sourceURL, [...reviews, ...newReviews]);
//   }
// }

async function clickNextButton(page) {
  // Click the next button
  await page.click('.pageContainer .nextButton');
}

async function getReviewsFromGlassdoor(sourceURL, filterDate) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const userAgent = await userAgents.rotateUserAgent();
  await page.setUserAgent(userAgent);

  await limiter.schedule(() => page.goto(sourceURL, { waitUntil: 'networkidle0' }));

  const title = await page.title();
  const overallReviewCount = await page.$eval('[data-test=ei-nav-reviews-link]', (el) => parseInt(el.innerText, 10));
  const overallRating = await page.$eval('.v2__EIReviewsRatingsStylesV2__ratingNum', (el) => el.innerText);

  const allReviews = [];
  async function getReviews() {
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

    console.log(reviews);

    allReviews.push(...reviews);

    // Check if the next button is disabled
    const isDisabled = await page.$eval('.pageContainer .nextButton', (button) => button.disabled);
    if (!isDisabled) {
      await page.click('.pageContainer .nextButton');
      await getReviews();
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
