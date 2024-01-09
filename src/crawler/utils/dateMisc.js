const isDateValid = (string) => {
  const date = new Date(string);
  return !Number.isNaN(date.getTime());
};

module.exports = {
  isDateValid,
};
