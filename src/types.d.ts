

declare namespace NodeJS {
  export interface Global {
    _google_trace_agent: any;
  }
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