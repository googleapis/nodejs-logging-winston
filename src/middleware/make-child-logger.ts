// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as winston from 'winston';
import {
  LOGGING_TRACE_KEY,
  LOGGING_SPAN_KEY,
  LOGGING_SAMPLED_KEY,
  LOGGING_OPERATION_KEY,
} from '../index';
import {google} from '@google-cloud/logging/build/protos/protos';
import ILogEntryOperation = google.logging.v2.ILogEntryOperation;

export function makeChildLogger(
  logger: winston.Logger,
  trace: string,
  span?: string,
  sampled?: boolean,
  operation?: ILogEntryOperation
) {
  return logger.child({
    [LOGGING_TRACE_KEY]: trace,
    [LOGGING_SPAN_KEY]: span,
    [LOGGING_SAMPLED_KEY]: sampled,
    [LOGGING_OPERATION_KEY]: operation,
  });
}
