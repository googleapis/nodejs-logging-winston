
import * as semver from 'semver';

require('winston');
const winstonVersion = require('winston/package.json').version;

// this is a class.
// tslint:disable-next-line:variable-name
export const LoggingWinston =
    semver.lt(winstonVersion, '3.0.0') ? require('./winston2').LoggingWinston : require('./winston3').LoggingWinston;
