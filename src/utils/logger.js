const timestamp = () => new Date().toISOString();

const logger = {
  info: (message, data) => {
    const extra = data ? ` | ${JSON.stringify(data)}` : '';
    console.log(`[${timestamp()}] [INFO] ${message}${extra}`);
  },

  warn: (message, data) => {
    const extra = data ? ` | ${JSON.stringify(data)}` : '';
    console.warn(`[${timestamp()}] [WARN] ${message}${extra}`);
  },

  error: (message, error) => {
    const errorStr = error ? ` | ${error.message || error}` : '';
    console.error(`[${timestamp()}] [ERROR] ${message}${errorStr}`);
    if (error?.stack) {
      console.error(`[${timestamp()}] [ERROR] Stack: ${error.stack}`);
    }
  },
};

module.exports = logger;
