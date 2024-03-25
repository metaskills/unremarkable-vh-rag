const isDebug = process.env.DEBUG;

const ai = (message, options = {}) => {
  if ((options.log && !isDebug) || isDebug) {
    console.log(`🤖 ${message}`);
  }
};

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const debug = (message) => {
  if (isDebug) {
    console.log(message);
  }
};

export { ai, sleep, isDebug, debug };
