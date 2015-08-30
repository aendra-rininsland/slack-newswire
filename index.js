'use strict';

/**
 * POSTs newswire stories to Slack via an incoming webhook.
 * 
 * @author Ændrew Rininsland      <aendrew@aendrew.com>
 * @since  30 Aug. 2015
 */

// module dependencies
var AWS = require('aws-sdk');

/**
 * The handler function.
 * 
 * @param {object}  event       The data regarding the event.
 * @param {object}  context     The AWS Lambda execution context.
 */
exports.handler = function(event, context) {
    context.succeed();
};