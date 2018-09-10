
import * as semver from 'semver';

require('winston');
const winstonVersion = require('winston/package.json').version;

// this is a class.
// tslint:disable-next-line:variable-name
export const LoggingWinston = semver.lt(winstonVersion, '3.0.0') ?
    require('./winston2').LoggingWinston :
    require('./winston3').LoggingWinston;
// winstons are required here so they dont get executed unless they are the
// correct versions. winston2 inherits from a class provided by winston <3. if
// its ever just left as an es6 class that symbol will have to be available to
// define the class and should fail.