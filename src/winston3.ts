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

import * as TransportStream from 'winston-transport';
import * as types from './types/core';
import { LoggingCommon } from './common';

type Callback = (err: Error, apiResponse: {}) => void;

export class LoggingWinston extends TransportStream {
  private common:LoggingCommon;
  constructor(options?: types.Options) {
    options = options||{}

    super({
      level: options.level,
    });

    this.common = new LoggingCommon(options)
  }

  log({message,level,splat,...metadata}:LogArg, callback: Callback) {
    
    this.common.log(level,message,metadata,callback)
  }
}

type LogArg = {
    /**
     * the logging message
     */
    message:string,
    /**
     * the log level defined in NPM_LEVEL_NAME_TO_CODE
     */
    level:string,
    /**
     * the stack for an error
     */
    stack?:{},
    /**
     * not used but should not be passed through to common
     */
    splat?:{},
    /**
     * set httpRequest to a http.clientRequest object to log it
     */
    httpRequest?:types.HttpRequest,
    labels:{}
} & {[key:string]:string}
