function ai(message) {
  console.log(`🤖 ${message}`);
}

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const isDebug = process.env.DEBUG;

const debug = (message) => {
  if (isDebug) {
    console.log(message);
  }
};

export { ai, sleep, isDebug, debug };
