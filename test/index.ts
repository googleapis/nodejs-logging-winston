/**
 * Copyright 2016 Google Inc. All Rights Reserved.
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

'use strict';

const assert = require('assert');
const extend = require('extend');
const nodeutil = require('util');
const proxyquire = require('proxyquire');
const util = require('@google-cloud/common').util;

describe('logging-winston', function() {
  let fakeLogInstance = {};
  let fakeLoggingOptions_: any;
  let fakeLogName_: any;

  function fakeLogging(options: any) {
    fakeLoggingOptions_ = options;
    return {
      log: function(logName: string) {
        fakeLogName_ = logName;
        return fakeLogInstance;
      },
    };
  }

  class FakeTransport {
    transportCalledWith_: any;
    constructor() {
    this.transportCalledWith_ = arguments;
    }
  }

  let fakeWinston = {
    transports: {},
    Transport: FakeTransport,
  };

  let LoggingWinston: any;
  let loggingWinston: any;

  let OPTIONS = {
    logName: 'log-name',
    levels: {
      one: 1,
    },
    resource: {},
    serviceContext: {
      service: 'fake-service',
    },
  };

  before(function() {
    LoggingWinston = proxyquire('../src/index.js', {
      '@google-cloud/logging': fakeLogging,
      winston: fakeWinston,
    });
  });

  beforeEach(function() {
    fakeLogInstance = {};
    fakeLoggingOptions_ = null;
    fakeLogName_ = null;
    loggingWinston = new LoggingWinston.LoggingWinston(OPTIONS);
  });

  describe('instantiation', function() {
    it('should create a new instance of LoggingWinston', function() {
      // jshint newcap:false
      let loggingWinston = LoggingWinston.LoggingWinston(OPTIONS);
      assert(loggingWinston instanceof LoggingWinston.LoggingWinston);
    });

    it('should inherit from winston.Transport', function() {
      assert.deepEqual(loggingWinston.transportCalledWith_[0], {
        level: (OPTIONS as any).level,
        name: OPTIONS.logName,
      });
    });

    it('should default to logging.write scope', function() {
      assert.deepEqual(fakeLoggingOptions_.scopes, [
        'https://www.googleapis.com/auth/logging.write',
      ]);
    });

    it('should initialize Log instance using provided scopes', function() {
      let fakeScope = 'fake scope';

      let optionsWithScopes = extend({}, OPTIONS);
      optionsWithScopes.scopes = fakeScope;

      new LoggingWinston.LoggingWinston(optionsWithScopes);

      assert.deepStrictEqual(fakeLoggingOptions_, optionsWithScopes);
    });

    it('should assign itself to winston.transports', function() {
      assert.strictEqual(
        (fakeWinston.transports as any).StackdriverLogging,
        LoggingWinston.LoggingWinston
      );
    });

    it('should localize inspectMetadata to default value', function() {
      assert.strictEqual(loggingWinston.inspectMetadata, false);
    });

    it('should localize the provided options.inspectMetadata', function() {
      let optionsWithInspectMetadata = extend({}, OPTIONS, {
        inspectMetadata: true,
      });

      let loggingWinston = new LoggingWinston.LoggingWinston(
        optionsWithInspectMetadata
      );
      assert.strictEqual(loggingWinston.inspectMetadata, true);
    });

    it('should localize provided levels', function() {
      assert.strictEqual(loggingWinston.levels, OPTIONS.levels);
    });

    it('should default to npm levels', function() {
      let optionsWithoutLevels = extend({}, OPTIONS);
      delete optionsWithoutLevels.levels;

      let loggingWinston = new LoggingWinston.LoggingWinston(
        optionsWithoutLevels
      );
      assert.deepEqual(loggingWinston.levels, {
        error: 3,
        warn: 4,
        info: 6,
        verbose: 7,
        debug: 7,
        silly: 7,
      });
    });

    it('should localize Log instance using default name', function() {
      let loggingOptions = extend({}, fakeLoggingOptions_);
      delete loggingOptions.scopes;

      assert.deepEqual(loggingOptions, OPTIONS);
      assert.strictEqual(fakeLogName_, OPTIONS.logName);
    });

    it('should localize Log instance using provided name', function() {
      let logName = 'log-name-override';

      let optionsWithLogName = extend({}, OPTIONS);
      optionsWithLogName.logName = logName;

      new LoggingWinston.LoggingWinston(optionsWithLogName);

      let loggingOptions = extend({}, fakeLoggingOptions_);
      delete loggingOptions.scopes;

      assert.deepEqual(loggingOptions, optionsWithLogName);
      assert.strictEqual(fakeLogName_, logName);
    });

    it('should localize the provided resource', function() {
      assert.strictEqual(loggingWinston.resource, OPTIONS.resource);
    });

    it('should localize the provided service context', function() {
      assert.strictEqual(loggingWinston.serviceContext, OPTIONS.serviceContext);
    });
  });

  describe('log', function() {
    let LEVEL = Object.keys(OPTIONS.levels)[0];
    let STACKDRIVER_LEVEL = 'alert'; // (code 1)
    let MESSAGE = 'message';
    let METADATA = {
      value: function() {},
    };

    beforeEach(function() {
      (fakeLogInstance as any).entry = util.noop;
      loggingWinston.stackdriverLog.emergency = util.noop;
      loggingWinston.stackdriverLog[STACKDRIVER_LEVEL] = util.noop;
    });

    it('should throw on a bad log level', function() {
      assert.throws(function() {
        loggingWinston.log(
          'non-existent-level',
          MESSAGE,
          METADATA,
          assert.ifError
        );
      }, /Unknown log level: non-existent-level/);
    });

    it('should not throw on `0` log level', function() {
      let options = extend({}, OPTIONS, {
        levels: {
          zero: 0,
        },
      });

      loggingWinston = new LoggingWinston.LoggingWinston(options);

      loggingWinston.log('zero', 'test message');
    });

    it('should properly create an entry', function(done) {
      loggingWinston.stackdriverLog.entry = function(entryMetadata: any, data: any) {
        assert.deepEqual(entryMetadata, {
          resource: loggingWinston.resource,
        });
        assert.deepStrictEqual(data, {
          message: MESSAGE,
          metadata: METADATA,
        });
        done();
      };

      loggingWinston.log(LEVEL, MESSAGE, METADATA, assert.ifError);
    });

    it('should append stack when metadata is an error', function(done) {
      let error = {
        stack: 'the stack',
      };

      loggingWinston.stackdriverLog.entry = function(entryMetadata: any, data: any) {
        assert.deepStrictEqual(data, {
          message: MESSAGE + ' ' + error.stack,
          metadata: error,
          serviceContext: OPTIONS.serviceContext,
        });
        done();
      };

      loggingWinston.log(LEVEL, MESSAGE, error, assert.ifError);
    });

    it('should use stack when metadata is err without message', function(done) {
      let error = {
        stack: 'the stack',
      };

      loggingWinston.stackdriverLog.entry = function(entryMetadata: any, data: any) {
        assert.deepStrictEqual(data, {
          message: error.stack,
          metadata: error,
          serviceContext: OPTIONS.serviceContext,
        });
        done();
      };

      loggingWinston.log(LEVEL, '', error, assert.ifError);
    });

    it('should not require metadata', function(done) {
      loggingWinston.stackdriverLog.entry = function(entryMetadata: any, data: any) {
        assert.deepEqual(entryMetadata, {
          resource: loggingWinston.resource,
        });
        assert.deepStrictEqual(data, {
          message: MESSAGE,
          metadata: {},
        });
        done();
      };

      loggingWinston.log(LEVEL, MESSAGE, assert.ifError);
    });

    it('should inspect metadata when inspectMetadata is set', function(done) {
      loggingWinston.inspectMetadata = true;

      loggingWinston.stackdriverLog.entry = function(entryMetadata: any, data: any) {
        let expectedWinstonMetadata = {};

        for (let prop in METADATA) {
          console.log(prop);
          console.log(METADATA);
          (expectedWinstonMetadata as any)[prop] = nodeutil.inspect((METADATA as any)[prop]);
        }
        console.log(data.metadata);
        console.log(expectedWinstonMetadata);
        assert.deepStrictEqual(data.metadata, expectedWinstonMetadata);

        done();
      };

      loggingWinston.log(LEVEL, MESSAGE, METADATA, assert.ifError);
    });

    it('should promote httpRequest property to metadata', function(done) {
      let HTTP_REQUEST = {
        statusCode: 418,
      };
      const metadataWithRequest = extend(
        {
          httpRequest: HTTP_REQUEST,
        },
        METADATA
      );

      loggingWinston.stackdriverLog.entry = function(entryMetadata: any, data: any) {
        assert.deepStrictEqual(entryMetadata, {
          resource: loggingWinston.resource,
          httpRequest: HTTP_REQUEST,
        });
        assert.deepStrictEqual(data, {
          message: MESSAGE,
          metadata: METADATA,
        });
        done();
      };
      loggingWinston.log(LEVEL, MESSAGE, metadataWithRequest, assert.ifError);
    });

    it('should promote prefixed trace property to metadata', function(done) {
      const metadataWithTrace = extend({}, METADATA);
      metadataWithTrace[LoggingWinston.LoggingWinston.LOGGING_TRACE_KEY] =
        'trace1';

      loggingWinston.stackdriverLog.entry = function(entryMetadata: any, data: any) {
        assert.deepStrictEqual(entryMetadata, {
          resource: loggingWinston.resource,
          trace: 'trace1',
        });
        assert.deepStrictEqual(data, {
          message: MESSAGE,
          metadata: METADATA,
        });
        done();
      };
      loggingWinston.log(LEVEL, MESSAGE, metadataWithTrace, assert.ifError);
    });

    it('should set trace metadata from agent if available', function(done) {
      let oldTraceAgent = global._google_trace_agent;
      global._google_trace_agent = {
        getCurrentContextId: function() {
          return 'trace1';
        },
        getWriterProjectId: function() {
          return 'project1';
        },
      };
      loggingWinston.stackdriverLog.entry = function(entryMetadata: any, data: any) {
        assert.deepStrictEqual(entryMetadata, {
          resource: loggingWinston.resource,
          trace: 'projects/project1/traces/trace1',
        });
        assert.deepStrictEqual(data, {
          message: MESSAGE,
          metadata: METADATA,
        });
        done();
      };

      loggingWinston.log(LEVEL, MESSAGE, METADATA, assert.ifError);

      global._google_trace_agent = oldTraceAgent;
    });

    it('should leave out trace metadata if trace unavailable', function() {
      loggingWinston.stackdriverLog.entry = function(entryMetadata: any, data: any) {
        assert.deepStrictEqual(entryMetadata, {
          resource: loggingWinston.resource,
        });
        assert.deepStrictEqual(data, {
          message: MESSAGE,
          metadata: METADATA,
        });
      };

      let oldTraceAgent = global._google_trace_agent;

      global._google_trace_agent = {};
      loggingWinston.log(LEVEL, MESSAGE, METADATA, assert.ifError);

      global._google_trace_agent = {
        getCurrentContextId: function() {
          return null;
        },
        getWriterProjectId: function() {
          return null;
        },
      };
      loggingWinston.log(LEVEL, MESSAGE, METADATA, assert.ifError);

      global._google_trace_agent = {
        getCurrentContextId: function() {
          return null;
        },
        getWriterProjectId: function() {
          return 'project1';
        },
      };
      loggingWinston.log(LEVEL, MESSAGE, METADATA, assert.ifError);

      global._google_trace_agent = {
        getCurrentContextId: function() {
          return 'trace1';
        },
        getWriterProjectId: function() {
          return null;
        },
      };
      loggingWinston.log(LEVEL, MESSAGE, METADATA, assert.ifError);

      global._google_trace_agent = oldTraceAgent;
    });

    it('should write to the log', function(done) {
      let entry = {};

      loggingWinston.stackdriverLog.entry = function() {
        return entry;
      };

      loggingWinston.stackdriverLog[STACKDRIVER_LEVEL] = function(
        entry_: any,
        callback: any
      ) {
        assert.strictEqual(entry_, entry);
        callback(); // done()
      };

      loggingWinston.log(LEVEL, MESSAGE, METADATA, done);
    });
  });
});
