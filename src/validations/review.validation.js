const Joi = require('joi');

const aggregate = {
  body: Joi.object().keys({
    source_name: Joi.string().required(),
    source_url: Joi.string().required().uri(),
    filter_date: Joi.date().iso(),
  }),
};

module.exports = {
  aggregate,
};
