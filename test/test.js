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
    fs = require('fs');
    context = require('aws-lambda-mock-context');
var assert = chai.assert;

// Use should flavour for Mocha
chai.should();
chai.use(sinonChai);

var index = require('../');
var pressAssociation = fs.readFileSync('test/data/press-association_mock.xml', 'UTF-8');
var reuters = fs.readFileSync('test/data/reuters_mock.xml', 'UTF-8');

process.env.NODE_ENV = 'devel'; // Ensure env is devel to prevent accidental posting.

describe('SlackNewswire', function() {
  beforeEach(function() {
    delete process.env.MIN_PRIORITY;
    process.env.NODE_DEBUG = false;
  });

  it('Should parse PA feeds', function(done) {
    index.handler({body: pressAssociation}, context());
    context.Promise
    .then(function(data) { // succeed() called
      // console.dir(data);
      assert(data.type === 'PA', 'Ensure type is PA.');
      assert(data.attachments.length === 1, 'There is one article.');

      var attachment = data.attachments[0];
      assert.propertyVal(attachment, 'fallback', 'HEADLINE HEADLINE [4] -- BODY COPY BODY COPY');
      assert.propertyVal(attachment, 'color', '#cce600');
      assert.propertyVal(attachment, 'title', 'HEADLINE HEADLINE');
      assert.propertyVal(attachment, 'pretext', undefined);
      assert.propertyVal(attachment, 'text', 'BODY COPY BODY COPY\nends');
      assert.propertyVal(attachment, 'author_name', 'FIRSTNAME LASTNAME, Press Association');
      assert.propertyVal(attachment, 'author_link', 'https://www.pressassociation.com/');
      //assert.propertyVal(attachment, 'author_icon', '');
      assert(attachment.fields.length === 4, 'Ensure there are four fields');
      assert.propertyVal(attachment.fields[0], 'title', 'slugline');
      assert.propertyVal(attachment.fields[0], 'value', 'POLICE Collision');
      assert.propertyVal(attachment.fields[1], 'title', 'Methode Name');
      assert.propertyVal(attachment.fields[1], 'value', '28PACOLLISION1');
      assert.propertyVal(attachment.fields[2], 'title', 'News Item ID');
      assert.propertyVal(attachment.fields[2], 'value', 'PA-HHH-POLICE-Collision');
      assert.propertyVal(attachment.fields[3], 'title', 'Priority');
      assert.propertyVal(attachment.fields[3], 'value', '4: Medium priority');
      done();
    })
    .catch(function(err) { // fail() called
      done(err);
    });
  });

  it('Should parse Reuters feeds', function(done) {
    index.handler({body: reuters}, context());

    context.Promise
    .then(function(data) { // succeed() called
      assert(data.type === 'Reuters', 'Ensure type is Reuters.');
      assert(data.attachments.length === 1, 'There is one article.');

      var attachment = data.attachments[0];
      assert.propertyVal(attachment, 'fallback', 'HEADLINE HEADLINE HEADLINE [2] -- BODY COPY');
      assert.propertyVal(attachment, 'color', '#ff8000');
      assert.propertyVal(attachment, 'title', 'HEADLINE HEADLINE HEADLINE');
      assert.propertyVal(attachment, 'pretext', undefined);
      assert.propertyVal(attachment, 'text', 'BODY COPY\n(Reporting by FIRSTNAME LASTNAME; writing by FIRSTNAME LASTNAME; editing by FIRSTNAME LASTNAME)');
      assert.propertyVal(attachment, 'author_name', 'Thomson Reuters');
      assert.propertyVal(attachment, 'author_link', 'http://about.reuters.com/');
      //assert.propertyVal(attachment, 'author_icon', '');
      assert(attachment.fields.length === 4, 'Ensure there are four fields');
      assert.propertyVal(attachment.fields[0], 'title', 'slugline');
      assert.propertyVal(attachment.fields[0], 'value', 'PLACE-TOPIC/SUBJECT (URGENT)');
      assert.propertyVal(attachment.fields[1], 'title', 'Methode Name');
      assert.propertyVal(attachment.fields[1], 'value', '28RTURGENT');
      assert.propertyVal(attachment.fields[2], 'title', 'News Item ID');
      assert.propertyVal(attachment.fields[2], 'value', 'ABCDEFGH');
      assert.propertyVal(attachment.fields[3], 'title', 'Priority');
      assert.propertyVal(attachment.fields[3], 'value', '2: :rotating_light: High priority :rotating_light:');
      done();
    })
    .catch(function(err) {
      // fail() called
      done(err);
    });
  });

  it('Should respect the MIN_PRIORITY environment variable.', function(done){
    process.env.MIN_PRIORITY = 3; // Set min-priority to 3.

    index.handler({body: reuters}, context()); // Reuters is P2.
    context.Promise
    .then(function(data) {
      assert(data.attachments.length > 0, 'Ensure there are attachments.');
    })
    .catch(function(err) {
        // fail() called
        done(err);
    });

    index.handler({body: pressAssociation}, context()); // PA is P4.
    context.Promise
    .then(function(data) {
      // Shouldn't be any data. I don't think this assertion should ever run.
      assert.isUndefined(data);
    })
    .catch(function(err) {
      // fail() called
      assert.equal(err, 'Below priority threshold', 'Should not post statuses below threshold.');
      done();
    });
  });
});

describe('SlackNewswire with env var NODE_DEBUG', function(){
  // This allows us to spy on the console. Using stubs suppresses the output.
  beforeEach(function() {
    sinon.stub(console, 'log').returns(void 0);
    sinon.stub(console, 'dir').returns(void 0);

    // Comment out the above and uncomment these if you need to use console.log/dir
    // when debugging this spec.
    // sinon.spy(console, 'log');
    // sinon.spy(console, 'dir');
  });

  afterEach(function() {
    console.log.restore();
    console.dir.restore();
  });

  it('Should output debug information if NODE_DEBUG=true', function(done){
    process.env.NODE_DEBUG = true; // Set DEBUG to true.

    index.handler({body: reuters}, context());
    context.Promise
    .then(function(data) {
      assert.equal(console.log.callCount, 3);
      assert.equal(console.dir.callCount, 1);
      done();
    })
    .catch(function(err) {
        // fail() called
        done(err);
    });
  });

  it('Should suppress debug information if NODE_DEBUG=false', function(done){
    process.env.NODE_DEBUG = false; // Set DEBUG to false.

    index.handler({body: reuters}, context());
    context.Promise
    .then(function(data) {
      assert.isFalse(console.log.called);
      assert.isFalse(console.dir.called);
      done();
    })
    .catch(function(err) {
      // fail() called
      done(err);
    });
  });

  it('Should suppress debug information if NODE_DEBUG=undefined', function(done){
    process.env.NODE_DEBUG = undefined; // Set DEBUG to undefined

    index.handler({body: reuters}, context());
    context.Promise
    .then(function(data) {
      assert.isFalse(console.log.called);
      assert.isFalse(console.dir.called);
      done();
    })
    .catch(function(err) {
      // fail() called
      done(err);
    });
  });
});
