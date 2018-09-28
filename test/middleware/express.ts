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
import {LogEntry} from 'winston';
import * as TransportStream from 'winston-transport';

const inject = require('require-inject');

// types-only import. Actual require is done through require-inject below.
import {MiddlewareOptions} from '../../src/middleware/express';

const FAKE_PROJECT_ID = 'project-🦄';
const FAKE_GENERATED_MIDDLEWARE = () => {};

let passedOptions: MiddlewareOptions|undefined;
let loggedEntry: LogEntry|undefined;
class FakeLoggingWinston extends TransportStream {
  // tslint:disable-next-line:no-any Doing "just enough" faking.
  common: any;

  constructor(options: MiddlewareOptions) {
    super(options);
    passedOptions = options;
    this.common = {
      stackdriverLog: {
        logging: {
          auth: {
            async getProjectId() {
              return FAKE_PROJECT_ID;
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
function fakeMakeMiddleware(
    projectId: string, makeChildLogger: Function): Function {
  passedProjectId = projectId;
  return FAKE_GENERATED_MIDDLEWARE;
}

const {middleware} = inject('../../src/middleware/express', {
  '../../src/index': {LoggingWinston: FakeLoggingWinston},
  '../../src/middleware/make-middleware':
      {makeMiddleware: fakeMakeMiddleware}
});

describe('middleware', () => {
  beforeEach(() => {
    passedOptions = undefined;
    passedProjectId = undefined;
    loggedEntry = undefined;
  });

  it('should create and return a middleware', async () => {
    const {mw} = await middleware();
    assert.strictEqual(mw, FAKE_GENERATED_MIDDLEWARE);
  });

  it('should use default logName and level', async () => {
    await middleware();
    assert.ok(passedOptions);
    assert.strictEqual(passedOptions!.logName, 'winston_log');
    assert.strictEqual(passedOptions!.level, 'info');
  });

  it('should prefer user-provided logName and level', async () => {
    const LOGNAME = '㏒';
    const LEVEL = '🎚';
    const OPTIONS = {logName: LOGNAME, level: LEVEL};
    await middleware(OPTIONS);
    assert.ok(passedOptions);
    assert.strictEqual(passedOptions!.logName, LOGNAME);
    assert.strictEqual(passedOptions!.level, LEVEL);
  });

  it('should allow users pass custom logLevels to winston', async () => {
    const {logger} = await middleware(
        {level: 'moe', levels: {eeny: 0, meeny: 1, miney: 2, moe: 3}});
    logger.miney('catch a tiger by the toe');
    assert.ok(loggedEntry);
    assert.strictEqual(loggedEntry!.level, 'miney');
    assert.strictEqual(loggedEntry!.message, 'catch a tiger by the toe');
  });

  it('should acquire the projectId and pass it makeMiddleware', async () => {
    await middleware();
    assert.strictEqual(passedProjectId, FAKE_PROJECT_ID);
  });

  it('should throw when projectId is not available');
});
