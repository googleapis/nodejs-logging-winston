/*!
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

import * as extend from 'extend';
import * as util from 'util';
// TODO: Address type incorrectness in @types/is
const is: {fn: (value: {}) => boolean; object: (value: {}) => boolean} =
    require('is');
const logging = require('@google-cloud/logging');
const mapValues = require('lodash.mapvalues');
import * as winston from 'winston';

/**
 * Map of npm output levels to Stackdriver Logging levels.
 *
 * @type {object}
 * @private
 */
const NPM_LEVEL_NAME_TO_CODE = {
  error: 3,
  warn: 4,
  info: 6,
  verbose: 7,
  debug: 7,
  silly: 7,
};

/**
 * Map of Stackdriver Logging levels.
 *
 * @type {object}
 * @private
 */
const STACKDRIVER_LOGGING_LEVEL_CODE_TO_NAME: {[key: number]: string} = {
  0: 'emergency',
  1: 'alert',
  2: 'critical',
  3: 'error',
  4: 'warning',
  5: 'notice',
  6: 'info',
  7: 'debug'
};

/*!
 * Log entry data key to allow users to indicate a trace for the request.
 */
export const LOGGING_TRACE_KEY = 'logging.googleapis.com/trace';

/*!
 * Gets the current fully qualified trace ID when available from the
 * @google-cloud/trace-agent library in the LogEntry.trace field format of:
 * "projects/[PROJECT-ID]/traces/[TRACE-ID]".
 */
function getCurrentTraceFromAgent(): string|null {
  const agent = global._google_trace_agent;
  if (!agent || !agent.getCurrentContextId || !agent.getWriterProjectId) {
    return null;
  }

  const traceId = agent.getCurrentContextId();
  if (!traceId) {
    return null;
  }

  const traceProjectId = agent.getWriterProjectId();
  if (!traceProjectId) {
    return null;
  }

  return `projects/${traceProjectId}/traces/${traceId}`;
}


/**
 * Credentials object.
 */
export interface Credentials {
  client_email: string;
  private_key: string;
}

export interface Options {
  /**
   * The default log level. Winston will filter messages with a severity lower
   * than this.
   */
  level?: string;
  /**
   * Custom logging levels as supported by winston. This list is used to
   * translate your log level to the Stackdriver Logging level. Each property
   * should have an integer value between 0 (most severe) and 7 (least severe).
   * If you are passing a list of levels to your winston logger, you should
   * provide the same list here.
   */
  levels?: {[name: string]: number};
  /**
   *  Serialize winston-provided log metadata using `util.inspect`.
   */
  inspectMetadata: boolean;
  /**
   * The name of the log that will receive messages written to this transport.
   */
  logName?: string;
  /**
   * The monitored resource that the transport corresponds to. On Google Cloud
   * Platform, this is detected automatically, but you may optionally specify a
   * specific monitored resource. For more information see the
   * [official documentation]{@link
   * https://cloud.google.com/logging/docs/api/reference/rest/v2/MonitoredResource}.
   */
  resource?: MonitoredResource;
  /**
   * For logged errors, we provide this as the service context. For more
   * information see [this guide]{@link
   * https://cloud.google.com/error-reporting/docs/formatting-error-messages}
   * and the [official documentation]{@link
   * https://cloud.google.com/error-reporting/reference/rest/v1beta1/ServiceContext}.
   */
  serviceContext?: ServiceContext;
  /**
   * he project ID from the Google Cloud Console, e.g. 'grape-spaceship-123'. We
   * will also check the environment variable `GCLOUD_PROJECT` for your project
   * ID. If your app is running in an environment which supports {@link
   * https://cloud.google.com/docs/authentication/production#providing_credentials_to_your_application
   * Application Default Credentials}, your project ID will be detected
   * automatically.
   */
  projectId?: string;
  /**
   * Full path to the a .json, .pem, or .p12 key downloaded from the Google
   * Cloud Console. If you provide a path to a JSON file, the `projectId` option
   * above is not necessary. NOTE: .pem and .p12 require you to specify the
   * `email` option as well.
   */
  keyFilenam?: string;
  /**
   * Account email address. Required when using a .pem or .p12 keyFilename.
   */
  email?: string;
  /**
   * Automatically retry requests if the response is related to rate limits or
   * certain intermittent server errors. We will exponentially backoff
   * subsequent requests by default.
   */
  autoRetry: boolean;
  /**
   * Maximum number of automatic retries attempted before returning the error.
   */
  maxRetries: number;
  /**
   * Custom promise module to use instead of native Promises.
   */
  // TODO: address the correct type of promise.
  promise: {};
}

/**
 * This module provides support for streaming your winston logs to
 * [Stackdriver Logging](https://cloud.google.com/logging).
 *
 * @class
 *
 * @param {object} [options]
 * @param {object} [options.level] The default log level. Winston will filter
 *     messages with a severity lower than this.
 * @param {object} [options.levels] Custom logging levels as supported by
 *     winston. This list is used to translate your log level to the Stackdriver
 *     Logging level. Each property should have an integer value between 0 (most
 *     severe) and 7 (least severe). If you are passing a list of levels to your
 *     winston logger, you should provide the same list here.
 * @param {boolean} [options.inspectMetadata=false] Serialize winston-provided log
 *     metadata using `util.inspect`.
 * @param {string} [options.logName=winston_log] The name of the log that will receive
 *     messages written to this transport.
 * @param {object} [options.resource] The monitored resource that the transport
 *     corresponds to. On Google Cloud Platform, this is detected automatically,
 *     but you may optionally specify a specific monitored resource. For more
 *     information see the
 *     [official documentation]{@link
 * https://cloud.google.com/logging/docs/api/reference/rest/v2/MonitoredResource}.
 * @param {object} [options.serviceContext] For logged errors, we provide this
 *     as the service context. For more information see
 *     [this guide]{@link
 * https://cloud.google.com/error-reporting/docs/formatting-error-messages} and
 * the [official documentation]{@link
 * https://cloud.google.com/error-reporting/reference/rest/v1beta1/ServiceContext}.
 * @param {string} [options.serviceContext.service] An identifier of the
 *     service, such as the name of the executable, job, or Google App Engine
 *     service name.
 * @param {string} [options.serviceContext.version] Represents the version of
 *     the service.
 * @param {string} [options.projectId] The project ID from the Google Cloud
 *     Console, e.g. 'grape-spaceship-123'. We will also check the environment
 *     variable `GCLOUD_PROJECT` for your project ID. If your app is running in
 *     an environment which supports {@link
 * https://cloud.google.com/docs/authentication/production#providing_credentials_to_your_application
 * Application Default Credentials}, your project ID will be detected
 * automatically.
 * @param {string} [options.keyFilename] Full path to the a .json, .pem, or .p12
 *     key downloaded from the Google Cloud Console. If you provide a path
 *     to a JSON file, the `projectId` option above is not necessary. NOTE: .pem
 *     and .p12 require you to specify the `email` option as well.
 * @param {string} [options.email] Account email address. Required when using a
 *     .pem or .p12 keyFilename.
 * @param {object} [options.credentials] Credentials object.
 * @param {string} [options.credentials.client_email]
 * @param {string} [options.credentials.private_key]
 * @param {boolean} [options.autoRetry=true] Automatically retry requests if the
 *     response is related to rate limits or certain intermittent server errors.
 *     We will exponentially backoff subsequent requests by default.
 * @param {number} [options.maxRetries=3] Maximum number of automatic retries
 *     attempted before returning the error.
 * @param {constructor} [options.promise] Custom promise module to use instead
 *     of native Promises.
 *
 * @example <caption>Import the client library</caption>
 * const LoggingWinston = require('@google-cloud/logging-winston');
 *
 * @example <caption>Create a client that uses <a
 * href="https://cloud.google.com/docs/authentication/production#providing_credentials_to_your_application">Application
 * Default Credentials (ADC)</a>:</caption> const loggingWinston = new
 * LoggingWinston();
 *
 * @example <caption>Create a client with <a
 * href="https://cloud.google.com/docs/authentication/production#obtaining_and_providing_service_account_credentials_manually">explicit
 * credentials</a>:</caption> const loggingWinston = new LoggingWinston({
 *   projectId: 'your-project-id',
 *   keyFilename: '/path/to/keyfile.json'
 * });
 *
 * @example <caption>include:samples/quickstart.js</caption>
 * region_tag:logging_winston_quickstart
 * Full quickstart example:
 */

export class LoggingWinston extends winston.Transport {
  inspectMetadata: boolean;
  levels: {[name: string]: number};
  stackdriverLog: StackdriverLog;  // TODO: add type for @google-cloud/logging
  resource: MonitoredResource|undefined;
  serviceContext: ServiceContext|undefined;
  static readonly LOGGING_TRACE_KEY = LOGGING_TRACE_KEY;
  constructor(options: Options) {
    if (new.target !== LoggingWinston) {
      return new LoggingWinston(options);
    }

    options = extend(
        {
          scopes: ['https://www.googleapis.com/auth/logging.write'],
        },
        options);

    const logName = options.logName || 'winston_log';

    super({
      level: options.level,
      name: logName,
    });

    this.inspectMetadata = options.inspectMetadata === true;
    this.levels = options.levels || NPM_LEVEL_NAME_TO_CODE;
    this.stackdriverLog = new logging(options).log(logName);
    this.resource = options.resource;
    this.serviceContext = options.serviceContext;
  }

  log(levelName: string, msg: string, metadata: Metadata|{},
      callback: (err: Error, apiResponse: {}) => void) {
    if (is.fn(metadata)) {
      callback = metadata as (err: Error, apiResponse: {}) => void;
      metadata = {};
    }

    if (this.levels[levelName] === undefined) {
      throw new Error('Unknown log level: ' + levelName);
    }

    const levelCode = this.levels[levelName];
    const stackdriverLevel = STACKDRIVER_LOGGING_LEVEL_CODE_TO_NAME[levelCode];

    const entryMetadata: StackdriverEntryMetadata = {
      resource: this.resource,
    };

    const data: StackdriverData = {};

    // Stackdriver Logs Viewer picks up the summary line from the `message`
    // property of the jsonPayload.
    // https://cloud.google.com/logging/docs/view/logs_viewer_v2#expanding.
    //
    // For error messages at severity 'error' and higher, Stackdriver
    // Error Reporting will pick up error messages if the full stack trace is
    // included in the textPayload or the message property of the jsonPayload.
    // https://cloud.google.com/error-reporting/docs/formatting-error-messages
    // We prefer to format messages as jsonPayload (by putting it as a message
    // property on an object) as that works is accepted by Error Reporting in
    // for more resource types.
    //
    if (metadata && (metadata as Metadata).stack) {
      msg += (msg ? ' ' : '') + (metadata as Metadata).stack;
      data.serviceContext = this.serviceContext;
    }
    data.message = msg;

    if (is.object(metadata)) {
      data.metadata =
          this.inspectMetadata ? mapValues(metadata, util.inspect) : metadata;

      // If the metadata contains a httpRequest property, promote it to the
      // entry metadata. This allows Stackdriver to use request log formatting.
      // https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#HttpRequest
      // Note that the httpRequest field must properly validate as HttpRequest
      // proto message, or the log entry would be rejected by the API. We no do
      // validation here.
      if ((metadata as Metadata).httpRequest) {
        entryMetadata.httpRequest = (metadata as Metadata).httpRequest;
        delete (data.metadata as Metadata).httpRequest;
      }
    }

    // tslint:disable-next-line:no-any
    if (metadata && (metadata as any)[LOGGING_TRACE_KEY]) {
      // tslint:disable-next-line:no-any
      entryMetadata.trace = (metadata as any)[LOGGING_TRACE_KEY];
      // tslint:disable-next-line:no-any
      delete (data.metadata as any)[LOGGING_TRACE_KEY];
    } else {
      const trace = getCurrentTraceFromAgent();
      if (trace) {
        entryMetadata.trace = trace;
      }
    }

    const entry = this.stackdriverLog.entry(entryMetadata, data);
    // tslint:disable-next-line:no-any
    (this.stackdriverLog as any)[stackdriverLevel](entry, callback);
  }
}

// tslint:disable-next-line:no-any
(winston.transports as any).StackdriverLogging = LoggingWinston;
