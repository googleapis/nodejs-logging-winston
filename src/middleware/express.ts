/*!
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as winston from 'winston';

import {LoggingWinston} from '../index';
import * as types from '../types/core';

import {makeChildLogger} from './make-child-logger';
import {AnnotatedRequestType, makeMiddleware} from './make-middleware';

export type AnnotatedRequest = AnnotatedRequestType<winston.Logger>;

export interface MiddlewareOptions extends types.Options {
  level?: string;
  levels?: winston.config.AbstractConfigSetLevels;
}

export async function middleware(options?: MiddlewareOptions) {
  const defaultOptions = {
    logName: 'winston_log',
    level: 'info',
    levels: winston.config.npm.levels
  };
  options = Object.assign({}, defaultOptions, options);

  const loggingWinston = new LoggingWinston(options);
  const projectId =
      await loggingWinston.common.stackdriverLog.logging.auth.getProjectId();
  // Failure to acquire projectId from auth would throw to the user.

  const logger = winston.createLogger({
    level: options.level,
    levels: options.levels,
    transports: [loggingWinston]
  });

  return {
    logger,
    mw: makeMiddleware(
        projectId,
        (trace: string) => {
          return makeChildLogger(logger, trace);
        })
  };
}
