declare namespace NodeJS {
  export interface Global {
    _google_trace_agent: any;
  }
}

interface Options {
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

interface MonitoredResource {
  type?: string;
  labels?: {[key: string]: string};
}

interface ServiceContext {
  /**
   * An identifier of the service, such as the name of the executable, job, or
   * Google App Engine service name.
   */
  service: string;
  /**
   * Represents the version of the service.
   */
  version: string;
}


interface StackdriverData {
  serviceContext?: ServiceContext,
  message?: string,
  metadata?: Metadata
}

interface StackdriverEntryMetadata {
  resource?: MonitoredResource,
  httpRequest?: HttpRequest,
  trace?: {}
}

interface StackdriverLog {
  constructor: (logging: StackdriverLogging, name: string, options?: {}) => StackdriverLog,  
  critical: (entry: StackdriverEntry, options?: {}, callback?: (err: Error, apiResponse: {}) => void) => Promise<LogWriteResponse>,
  debug: (entry: StackdriverEntry, options?: {}, callback?: (err: Error, apiResponse: {}) => void) => Promise<LogWriteResponse>,
  emergency: (entry: StackdriverEntry, options?: {}, callback?: (err: Error, apiResponse: {}) => void) => Promise<LogWriteResponse>,
  error: (entry: StackdriverEntry, options?: {}, callback?: (err: Error, apiResponse: {}) => void) => Promise<LogWriteResponse>,
  info: (entry: StackdriverEntry, options?: {}, callback?: (err: Error, apiResponse: {}) => void) => Promise<LogWriteResponse>,
  notice: (entry: StackdriverEntry, options?: {}, callback?: (err: Error, apiResponse: {}) => void) => Promise<LogWriteResponse>,
  warning: (entry: StackdriverEntry, options?: {}, callback?: (err: Error, apiResponse: {}) => void) => Promise<LogWriteResponse>,
  write: (entry: StackdriverEntry, options?: {}, callback?: (err: Error, apiResponse: {}) => void) => Promise<LogWriteResponse>,
  alert: (entry: StackdriverEntry, options?: {}, callback?: (err: Error, apiResponse: {}) => void) => Promise<LogWriteResponse>,
  entry: (metadata: {}, data: {}|string) => StackdriverEntry
}

interface StackdriverLogging {
  constructor: (options: {}) => StackdriverLogging,
  Entry: StackdriverEntry,
  Log: StackdriverLog,
  Logging: StackdriverLogging,
  // define additional properties and methods.
}

interface Metadata {
  stack?: string,
  httpRequest?: HttpRequest
}

interface StackdriverEntry {
  constructor: (metadata?: StackdriverEntryMetadata, data?: {}| string) => StackdriverEntry,
  data?: {}|string,
  metadata?: StackdriverEntryMetadata
}

type LogWriteResponse = {}[];

interface HttpRequest {
  requestMethod: string,
  requestUrl: string,
  requestSize: string,
  status: number,
  responseSize: string,
  userAgent: string,
  remoteIp: string,
  serverIp: string,
  referer: string,
  latency: string,
  cacheLookup: boolean,
  cacheHit: boolean,
  cacheValidatedWithOriginServer: boolean,
  cacheFillBytes: string,
  protocol: string,
}