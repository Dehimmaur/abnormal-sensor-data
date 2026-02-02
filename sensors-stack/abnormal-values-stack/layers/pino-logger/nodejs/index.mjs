import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      singleLine: false,
      ignore: "pid,hostname,timestamp",
      messageFormat: "{levelLabel} {msg}",
    },
  },
  base: undefined,
  timestamp: false,
  pid: false,
  hostname: false,
});

export default logger;
