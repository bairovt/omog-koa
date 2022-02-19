const yearNotFuture = (value, helpers) => {
  const nowYear = new Date().getFullYear();
  console.log("typeof value", typeof value);
  if (value > nowYear) {
    throw new Error("Year can not be more then current");
  }
  return value;
};

module.exports = {yearNotFuture};
