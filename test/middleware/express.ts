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

import * as assert from 'assert';
import {GCPEnv} from 'google-auth-library';
import {LogEntry} from 'winston';
import * as TransportStream from 'winston-transport';

const inject = require('require-inject');

// types-only import. Actual require is done through require-inject below.
import {MiddlewareOptions} from '../../src/middleware/express';

const FAKE_PROJECT_ID = 'project-🦄';
const FAKE_GENERATED_MIDDLEWARE = () => {};
const FAKE_ENVIRONMENT = 'FAKE_ENVIRONMENT';

let authEnvironment: string;
let passedOptions: Array<MiddlewareOptions|undefined>;
let loggedEntry: LogEntry;

class FakeLoggingWinston extends TransportStream {
  // tslint:disable-next-line:no-any Doing "just enough" faking.
  common: any;

  constructor(options: MiddlewareOptions) {
    super(options);
    passedOptions.push(options);
    this.common = {
      stackdriverLog: {
        logging: {
          auth: {
            async getProjectId() {
              return FAKE_PROJECT_ID;
            },
            async getEnv() {
              return authEnvironment;
            }
          }
        }
      }
    };
  }

  log(info: LogEntry, cb: Function) {
    loggedEntry = info;
    cb();
  }
}

let passedProjectId: string|undefined;
let passedEmitRequestLog: Function|undefined;
function fakeMakeMiddleware(
    projectId: string, makeChildLogger: Function,
    emitRequestLog: Function): Function {
  passedProjectId = projectId;
  passedEmitRequestLog = emitRequestLog;
  return FAKE_GENERATED_MIDDLEWARE;
}

const {middleware, APP_LOG_SUFFIX} = inject('../../src/middleware/express', {
  '../../src/index': {LoggingWinston: FakeLoggingWinston},
  '@google-cloud/logging':
      {middleware: {express: {makeMiddleware: fakeMakeMiddleware}}}
});

describe('middleware/express', () => {
  beforeEach(() => {
    passedOptions = [];
    passedProjectId = undefined;
    passedEmitRequestLog = undefined;
    authEnvironment = FAKE_ENVIRONMENT;
  });

  it('should create and return a middleware', async () => {
    const {mw} = await middleware();
    assert.strictEqual(mw, FAKE_GENERATED_MIDDLEWARE);
  });

  it('should generate two loggers with default logName and level', async () => {
    await middleware();
    // Should generate two loggers with the expected names.
    assert.ok(passedOptions);
    assert.strictEqual(passedOptions.length, 2);
    assert.ok(passedOptions.some(
        option => option!.logName === `winston_log_${APP_LOG_SUFFIX}`));
    assert.ok(passedOptions.some(option => option!.logName === `winston_log`));
    assert.ok(passedOptions.every(option => option!.level === 'info'));
  });

  it('should prefer user-provided logName and level', async () => {
    const LOGNAME = '㏒';
    const LEVEL = 'fatal';
    const OPTIONS = {logName: LOGNAME, level: LEVEL};
    await middleware(OPTIONS);
    assert.ok(passedOptions);
    assert.strictEqual(passedOptions.length, 2);
    assert.ok(passedOptions.some(
        option => option!.logName === `${LOGNAME}_${APP_LOG_SUFFIX}`));
    assert.ok(passedOptions.some(option => option!.logName === LOGNAME));
    assert.ok(passedOptions.every(option => option!.level === LEVEL));
  });

  it('should acquire the projectId and pass to makeMiddleware', async () => {
    await middleware();
    assert.strictEqual(passedProjectId, FAKE_PROJECT_ID);
  });

  [GCPEnv.APP_ENGINE, GCPEnv.CLOUD_FUNCTIONS].forEach(env => {
    it(`should not generate the request logger on ${env}`, async () => {
      authEnvironment = env;
      await middleware();
      assert.ok(passedOptions);
      assert.strictEqual(passedOptions.length, 1);
      // emitRequestLog parameter to makeChildLogger should be undefined.
      assert.strictEqual(passedEmitRequestLog, undefined);
    });
  });
});
