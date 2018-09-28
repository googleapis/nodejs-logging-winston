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
import * as extend from 'extend';

const inject = require('require-inject');

const STACKDRIVER_TRACE_HEADER_NAME = 'x-cloud-trace-context';
const FAKE_PROJECT_ID = '🦄';
// tslint:disable-next-line:no-any
const FAKE_REQUEST: any = {
  headers: {'content-type': 'application/🍰'}
};
Object.freeze(FAKE_REQUEST);
const FAKE_RESPONSE = {};
Object.freeze(FAKE_RESPONSE);
const FAKE_TRACE_ID = '123456';
const FAKE_SPAN_CONTEXT = `${FAKE_TRACE_ID}/1234`;
const REQUEST_WITH_TRACEID = extend(
    true, {}, FAKE_REQUEST,
    {headers: {[STACKDRIVER_TRACE_HEADER_NAME]: FAKE_SPAN_CONTEXT}});

describe('make-middleware', () => {
  const {makeMiddleware} = inject('../../src/middleware/make-middleware', {});

  it('should return a function accepting 3 arguments', () => {
    const middleware = makeMiddleware(FAKE_PROJECT_ID, () => {});
    assert.ok(typeof middleware === 'function');
    assert.ok(middleware.length === 3);
  });

  describe('middleware', () => {
    it('should call the next middleware synchronously', () => {
      const middleware = makeMiddleware(FAKE_PROJECT_ID, () => {});
      let called = false;
      middleware(extend(true, {}, FAKE_REQUEST), FAKE_RESPONSE, () => {
        called = true;
      });
      assert.ok(called);
    });

    it('should call makeChildLogger synchronously', () => {
      let called = false;
      const middleware = makeMiddleware(FAKE_PROJECT_ID, () => {
        called = true;
      });
      middleware(extend(true, {}, FAKE_REQUEST), FAKE_RESPONSE, () => {});
      assert.ok(called);
    });

    it('should use traceId from the request headers', () => {
      const middleware = makeMiddleware(FAKE_PROJECT_ID, (trace: string) => {
        assert.strictEqual(
            trace, `projects/${FAKE_PROJECT_ID}/traces/${FAKE_TRACE_ID}`);
      });
      middleware(REQUEST_WITH_TRACEID, FAKE_RESPONSE, () => {});
    });

    it('should inject a traceId header if not present', () => {
      let trace;
      const request = extend(true, {}, FAKE_REQUEST);
      const middleware = makeMiddleware(FAKE_PROJECT_ID, (trace_: string) => {
        trace = trace_;
      });
      middleware(request, FAKE_RESPONSE, () => {});
      assert.ok(request.headers![STACKDRIVER_TRACE_HEADER_NAME]);
    });

    it('should inject unique traceId headers if not present', () => {
      const traces: string[] = [];
      const middleware = makeMiddleware(FAKE_PROJECT_ID, (trace: string) => {
        traces.push(trace);
      });
      middleware(extend(true, {}, FAKE_REQUEST), FAKE_RESPONSE, () => {});
      middleware(extend(true, {}, FAKE_REQUEST), FAKE_RESPONSE, () => {});
      middleware(extend(true, {}, FAKE_REQUEST), FAKE_RESPONSE, () => {});
      assert.strictEqual(traces.length, 3);
      // Make sure the values are unique by creating a Set out of the array
      // elements.
      assert.strictEqual((new Set(traces)).size, traces.length);
    });

    it('should annotate the request with a child logger', () => {
      const CHILD_LOGGER = '🤡';
      const request = extend(true, {}, FAKE_REQUEST);
      const middleware = makeMiddleware(FAKE_PROJECT_ID, (trace: string) => {
        return CHILD_LOGGER;
      });
      middleware(request, FAKE_RESPONSE, () => {});
      assert.strictEqual(request.log, CHILD_LOGGER);
    });
  });
});