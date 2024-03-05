function ai(message) {
  console.log(`🤖 ${message}`);
}

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const debug = (message) => {
  if (process.env.DEBUG) {
    console.log(message);
  }
};

export { ai, sleep, debug };
