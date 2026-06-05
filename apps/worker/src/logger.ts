import { pino } from 'pino';
import { getServerEnv } from '@liberscript/core';

const { LOG_LEVEL, NODE_ENV } = getServerEnv();

export const logger = pino({
  level: LOG_LEVEL,
  ...(NODE_ENV === 'development'
    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
    : {}),
});
