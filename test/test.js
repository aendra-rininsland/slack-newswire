'use strict';

/**
 * Test suite for POSTs newswire stories to Slack via an incoming webhook.
 * 
 * @author Ændrew Rininsland      <aendrew@aendrew.com>
 * @since  30 Aug. 2015
 */

// module dependencies
var chai = require('chai'),
    sinon = require('sinon'),
    sinonChai = require('sinon-chai'),
    context = require('aws-lambda-mock-context');

// Use should flavour for Mocha
chai.should();
chai.use(sinonChai);

var index = require('../');

describe('SlackNewswire', function() {
    
    it('Should call the succeed method', function(done) {
        index.handler({hello: 'world'}, context());

        context.Promise
            .then(function() {
                // succeed() called
                done();
            })
            .catch(function(err) {
                // fail() called
                done(err);
            });
    });
});