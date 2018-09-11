
import * as semver from 'semver';

require('winston');
const winstonVersion = require('winston/package.json').version;

// this is a class.
// tslint:disable-next-line:variable-name
export const LoggingWinston = semver.lt(winstonVersion, '3.0.0') ?
    require('./winston2').LoggingWinston :
    require('./winston3').LoggingWinston;
// winstons are required instead of imported so they are not executed unless
// they're used.