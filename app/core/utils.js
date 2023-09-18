/**
 * Copyright (c) 2014, Tidepool Project
 *
 * This program is free software; you can redistribute it and/or modify it under
 * the terms of the associated License, which is identical to the BSD 2-Clause
 * License as published by the Open Source Initiative at opensource.org.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the License for more details.
 *
 * You should have received a copy of the License along with this program; if
 * not, you can obtain one from Tidepool Project at tidepool.org.
 */

// Various helper functions

import _  from 'lodash';
import sundial from 'sundial';
import { format } from 'd3-format';

import { MGDL_UNITS, MMOLL_UNITS, MGDL_PER_MMOLL } from './constants';
import { utils as vizUtils } from '@tidepool/viz';

const { DEFAULT_BG_BOUNDS } = vizUtils.constants;

const utils = {};

/**
 * Convenience function for capitalizing a string
 *
 * @param  {String} str
 * @return {String}
 */
utils.capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// Returns the value in a nested object,
// where `props` is the sequence of properties to follow.
// Returns `undefined` if the key is not present,
// or the `notFound` value if supplied
utils.getIn = (obj, props, notFound) => {
  var start = {
    child: obj,
    isNotFound: false
  };

  var result = _.reduce(props, (state, prop) => {
    if (state.isNotFound) {
      return state;
    }

    var child = state.child;
    if (!_.has(child, prop)) {
      return {
        child: notFound,
        isNotFound: true
      };
    }

    return {
      child: child[prop],
      isNotFound: false
    };
  }, start);

  return result.child;
};

utils.isSupportedBrowser = () => {
  var userAgent = navigator.userAgent.toLowerCase();
  return (userAgent.indexOf('chrome') > -1 && userAgent.indexOf('opr') === -1 && userAgent.indexOf('mobi') === -1);
};

utils.isMobile = () => {
  var userAgent = navigator.userAgent.toLowerCase();
  return (userAgent.indexOf('mobi') > -1);
};

utils.validateEmail = email => {
  var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
};


// Shallow difference of two objects
// Returns all attributes and their values in `destination`
// that have different values from `source`
utils.objectDifference = (destination, source) => {
  var result = {};

  _.forEach(source, (sourceValue, key) => {
    var destinationValue = destination[key];
    if (!_.isEqual(sourceValue, destinationValue)) {
      result[key] = destinationValue;
    }
  });

  return result;
};

/**
 * Utility function to get whether page has changed or not
 *
 * @param  {Object} oldProps
 * @param  {[type]} newProps
 *
 * @return {Boolean}
 */
utils.isOnSamePage = (oldProps, newProps) => {
  return oldProps.location === newProps.location;
}

/**
 * Utility function to strip trailing slashes from a string
 *
 * @param  {str} string
 *
 * @return {String}
 */
utils.stripTrailingSlash = (str) => {
  return str.replace(/\/$/, '');
}

utils.buildExceptionDetails = () =>{
  return {
    href: window.location.href,
    stack: console.trace()
  };
};

utils.stringifyErrorData = data => {
  if(_.isEmpty(data)){
    return '';
  }

  if (_.isPlainObject(data)) {
    return JSON.stringify(data);
  }
  else {
    return data.toString();
  }
};

utils.getInviteEmail = function(location) {
  if (location && location.query) {

    let { inviteEmail } = location.query;

    if (!_.isEmpty(inviteEmail)) {
      // all standard query string parsers transform + to a space
      // so we reverse and swap spaces for +
      // in order to allow e-mails with mutators (e.g., +skip) to pass waitlist
      inviteEmail = inviteEmail.replace(/\s/, '+');

      if (utils.validateEmail(inviteEmail)) {
        return inviteEmail;
      }
    }
  }
  return null;
}

utils.getDonationAccountCodeFromEmail = function(email) {
  let matches = email.match(/\+(.*)@/) || [];
  return matches[1] || null;
}

utils.hasVerifiedEmail = function(user) {
  return (user.emailVerified);
}

utils.getSignupKey = function(location) {
  if (location && location.query) {
    let { signupKey } = location.query;

    if(!_.isEmpty(signupKey)){
      return signupKey;
    }
  }
  return false;
}

utils.getSignupEmail = function (location) {
  if (location && location.query) {
    let { signupEmail } = location.query;
    if (!_.isEmpty(signupEmail)) {
      // all standard query string parsers transform + to a space
      // so we reverse and swap spaces for +
      // in order to allow e-mails with mutators (e.g., +skip) to pass waitlist
      signupEmail = signupEmail.replace(/\s/, '+');

      if (utils.validateEmail(signupEmail)) {
        return signupEmail;
      }
    }
  }
  return null;
};

utils.getInviteKey = function(location) {
  if (location && location.query) {
    let { inviteKey } = location.query;

    if(!_.isEmpty(inviteKey)){
      return inviteKey;
    }
  }
  return '';
}

utils.getRoles = function(location) {
  if (location && location.query) {
    let { roles } = location.query;

    if(!_.isEmpty(roles)){
      let rolesFiltered = _.reject(_.map(roles.split(','), _.trim), _.isEmpty);

      if(!_.isEmpty(rolesFiltered)){
        return rolesFiltered;
      }
    }
  }
  return [];
}

utils.getCarelink = function(location) {
  if (location && location.query) {
    let { carelink } = location.query;

    if (!_.isUndefined(carelink)) {
      return carelink;
    }
  }
  return null;
}

utils.getDexcom = function(location) {
  if (location && location.query) {
    let { dexcom } = location.query;

    if (!_.isUndefined(dexcom)) {
      return dexcom;
    }
  }
  return null;
}

utils.getMedtronic = function(location) {
  if (location && location.query) {
    let { medtronic } = location.query;

    if (!_.isUndefined(medtronic)) {
      return medtronic;
    }
  }
  return null;
}

/**
 * Translate a BG value to the desired target unit
 *
 * @param {Number} a bg value
 * @param {String} one of [mg/dL, mmol/L] the units to convert to
 *
 * @return {Number} the converted value
 */
utils.translateBg = (value, targetUnits) => {
  if (targetUnits === MGDL_UNITS) {
    return parseInt(Math.round(value * MGDL_PER_MMOLL), 10);
  }
  return parseFloat((value / MGDL_PER_MMOLL).toFixed(1));
}

/**
 * Round a target BG value as appropriate
 * mg/dL - to the nearest 5
 * mmol/L - to the nearest .1
 *
 * @param {Number} a bg value
 * @param {String} one of [mg/dL, mmol/L] the units to convert to
 *
 * @return {Number} the converted value
 */
utils.roundBgTarget = (value, units) => {
  const nearest = units === MGDL_UNITS ? 5 : 0.1;
  const precision = units === MGDL_UNITS ? 0 : 1;
  return parseFloat((nearest * Math.round(value / nearest)).toFixed(precision));
}

utils.getTimePrefsForDataProcessing = (latestUpload, queryParams) => {
  var timePrefsForTideline;
  var browserTimezone = new Intl.DateTimeFormat().resolvedOptions().timeZone;

  try {
    sundial.checkTimezoneName(browserTimezone);
  } catch (err) {
    browserTimezone = false;
  }

  function setNewTimePrefs(timezoneName, fallbackToBrowserTimeZone = true) {
    try {
      sundial.checkTimezoneName(timezoneName);
      timePrefsForTideline = {
        timezoneAware: true,
        timezoneName: timezoneName
      };
    } catch(err) {
      if (fallbackToBrowserTimeZone && browserTimezone) {
        console.log('Not a valid timezone! Defaulting to browser timezone display:', browserTimezone);
        timePrefsForTideline = {
          timezoneAware: true,
          timezoneName: browserTimezone
        };
      }
      else {
        console.log('Not a valid timezone! Defaulting to timezone-naive display.');
        timePrefsForTideline = {
          timezoneAware: false,
        };
      }
    }
  }

  // a timezone in the queryParams always overrides any other timePrefs
  if (!_.isEmpty(queryParams.timezone)) {
    setNewTimePrefs(queryParams.timezone, false);
    console.log('Displaying in timezone from query params:', queryParams.timezone);
  }
  else if (!_.isEmpty(latestUpload) && !_.isEmpty(latestUpload.timezone)) {
    setNewTimePrefs(latestUpload.timezone);
    console.log('Defaulting to display in timezone of most recent upload at', latestUpload.normalTime, latestUpload.timezone);
  }
  else if (browserTimezone) {
    setNewTimePrefs(browserTimezone);
    console.log('Falling back to browser timezone:', browserTimezone);
  }
  else {
    console.log('Falling back to timezone-naive display.');
  }
  return timePrefsForTideline;
};

utils.getBGPrefsForDataProcessing = (patientSettings, { units: overrideUnits, source: overrideSource }) => {
  // Allow overriding stored BG Unit preferences via query param or preferred clinic BG units
  // If no override is specified, use patient settings units if availiable, otherwise 'mg/dL'
  const patientSettingsBgUnits = patientSettings?.units?.bg || MGDL_UNITS;

  const bgUnits = overrideUnits
    ? (overrideUnits?.replace('/', '').toLowerCase() === 'mmoll' ? MMOLL_UNITS : MGDL_UNITS)
    : patientSettingsBgUnits;

  const settingsOverrideActive = patientSettingsBgUnits !== bgUnits;
  const low = _.get(patientSettings, 'bgTarget.low', DEFAULT_BG_BOUNDS[bgUnits].targetLowerBound);
  const high = _.get(patientSettings, 'bgTarget.high', DEFAULT_BG_BOUNDS[bgUnits].targetUpperBound);

  var bgClasses = {
    low: {
      boundary: utils.roundBgTarget(
        settingsOverrideActive && patientSettings?.bgTarget?.low ? utils.translateBg(patientSettings.bgTarget.low, bgUnits) : low,
        bgUnits
      )
    },
    target: {
      boundary: utils.roundBgTarget(
        settingsOverrideActive && patientSettings?.bgTarget?.high ? utils.translateBg(patientSettings.bgTarget.high, bgUnits) : high,
        bgUnits
      )
    },
  };

  if (settingsOverrideActive) console.log(`Displaying BG in ${bgUnits} from ${overrideSource}`);

  return {
    bgUnits,
    bgClasses,
  };
}

// from http://bgrins.github.io/devtools-snippets/#console-save
// MIT license
(function(console) {

  console.save = function(data, filename){

    if(!data) {
      console.error('Console.save: No data');
      return;
    }

    if(!filename) filename = 'blip-output.json';

    if(typeof data === 'object'){
      data = JSON.stringify(data, undefined, 4);
    }

    var blob = new Blob([data], {type: 'text/json'});
    var e = document.createEvent('MouseEvents');
    var a = document.createElement('a');

    a.download = filename;
    a.href = window.URL.createObjectURL(blob);
    a.dataset.downloadurl =  ['text/json', a.download, a.href].join(':');
    e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    a.dispatchEvent(e);
  };
})(console);

utils.getUploaderDownloadURL = (releases) => {
  const latestRelease = _.filter(releases, {prerelease: false})[0];
  let latestTag = latestRelease.tag_name;
  const urlBase = 'https://github.com/tidepool-org/uploader/releases/latest/download';
  latestTag = latestTag.substr(1);
  const latestWinRelease = `${urlBase}/tidepool-uploader-setup-${latestTag}.exe`;
  const latestMacRelease = `${urlBase}/tidepool-uploader-${latestTag}.dmg`;
  return {
    latestWinRelease: latestWinRelease,
    latestMacRelease: latestMacRelease,
  };
}

utils.readableStatName = statId => ({
  readingsInRange: 'Readings in range',
  timeInAuto: 'Time in automation',
  timeInOverride: 'Time in activity',
  timeInRange: 'Time in range',
  totalInsulin: 'Insulin ratio',
}[statId] || statId);

utils.readableChartName = chartType => ({
  basics: 'Basics',
  bgLog: 'BG log',
  daily: 'Daily',
  trends: 'Trends',
}[chartType] || chartType);

utils.formatDecimal = (val, precision) => {
  if (precision === null || precision === undefined) {
    return format('d')(val);
  }
  return format(`.${precision}f`)(val);
};

utils.roundUp = (value, precision = 1) => {
  let shift = 10 ** precision;
  return Math.ceil(value * shift) / shift;
};

utils.roundDown = (value, precision = 1) => {
  let shift = 10 ** precision;
  return Math.floor(value * shift) / shift;
};

utils.thresholdRound = (value, comparator, threshold, defaultPrecision = 0) => {
  let precision = defaultPrecision;
  let percentage = value * 100;
  let roundingRange;

  // For these comments, assume the threshold is 4. Could be any number

  switch (comparator) {
    case '<':
    case '>=':
      // not fine to round up to the threshold
      // fine to round down to the threshold
      // lower than threshold should round down

      // 3.499 => 3
      // 3.5   => 3.5
      // 3.501 => 3.5
      // 3.999 => 3.9
      // 4.001 => 4
      // 4.499 => 4
      // 4.5   => 5

      roundingRange = [threshold - 0.5, threshold];

      if (percentage >= roundingRange[0] && percentage < roundingRange[1]) {
        precision = 1;
        percentage = utils.roundDown(percentage, precision);
      }
      break;

    case '>':
    case '<=':
      // fine to round up to the threshold
      // not fine to round down to the threshold
      // greater than threshold should round up

      // 3.499 => 3
      // 3.5   => 4
      // 3.501 => 4
      // 3.999 => 4
      // 4.001 => 4.1
      // 4.499 => 4.5
      // 4.5   => 5

      roundingRange = [threshold, threshold + 0.5];

      if (percentage > roundingRange[0] && percentage < roundingRange[1]) {
        precision = 1;
        percentage = utils.roundUp(percentage, precision);
      }
      break;
  }

  // We want to force extra precision on very small percentages, and for extra small numbers,
  // force rounding up so that we always show at least 0.01% if the value is technically above zero
  if (percentage > 0 && percentage < 0.5) {
    precision = 1;

    if (percentage < 0.05) {
      precision = 2;
      percentage = utils.roundUp(percentage, precision);
    }
  }

  return format(`.${precision}f`)(percentage);
}

export default utils;
