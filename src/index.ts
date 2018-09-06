
import * as semver from 'semver'
import { LoggingWinston as LoggingWinston2} from './winston2';
import { LoggingWinston as LoggingWinston3 } from './winston3';

require('winston')
const winstonVersion = require('winston/package.json').version

export const LoggingWinston = semver.gte(winstonVersion,'3.0.0')?LoggingWinston3:LoggingWinston2;