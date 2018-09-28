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

import * as context from '@opencensus/propagation-stackdriver';
import * as http from 'http';

// TODO: move this code to @google-cloud/logging so that it can be shared
// betwixt logging-{bunyan,winston}.

type Request = http.IncomingMessage;
type Response = http.ServerResponse;
type NextFunction = (err?: Error) => void;

export interface AnnotatedRequestType<LoggerType> extends Request {
  log: LoggerType;
}

export function makeMiddleware<LoggerType>(
    projectId: string, makeChildLogger: (trace: string) => LoggerType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const wrapper = {
      setHeader(name: string, value: string) {
        req.headers[name] = value;
      },
      getHeader(name: string) {
        return req.headers[name];
      }
    };

    let spanContext = context.extract(wrapper);
    if (!spanContext) {
      // We were the first actor to detect lack of context. Establish context.
      spanContext = context.generate();
      context.inject(wrapper, spanContext);
    }

    const trace = `projects/${projectId}/traces/${spanContext.traceId}`;
    (req as AnnotatedRequestType<LoggerType>).log = makeChildLogger(trace);
    next();
  };
}
