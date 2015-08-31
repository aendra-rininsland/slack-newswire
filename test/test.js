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

describe('SlackNewswire', function() {
  var pressAssociation = fs.readFileSync('test/data/press-association_mock.xml', 'UTF-8');
  var reuters = fs.readFileSync('test/data/reuters_mock.xml', 'UTF-8');
  
  it('Should parse PA feeds', function(done) {
    index.handler({body: pressAssociation}, context());
    context.Promise
    .then(function(data) { // succeed() called
      assert(data.type === 'PA', 'Ensure type is PA.');
      assert(data.attachments.length === 1, 'There is one article.')
      
      var attachment = data.attachments[0];
      assert.propertyVal(attachment, 'fallback', 'HEADLINE HEADLINE [4] -- BODY COPY BODY COPY');
      assert.propertyVal(attachment, 'color', '#cce600');
      assert.propertyVal(attachment, 'title', 'HEADLINE HEADLINE [4]');
      assert.propertyVal(attachment, 'pretext', '');
      assert.propertyVal(attachment, 'text', 'BODY COPY BODY COPY\nends');
      assert.propertyVal(attachment, 'author_name', 'FIRSTNAME LASTNAME, Press Association');
      assert.propertyVal(attachment, 'author_link', 'https://www.pressassociation.com/');
      //assert.propertyVal(attachment, 'author_icon', '');
      assert(attachment.fields.length === 3, 'Ensure there are two fields');
      assert.propertyVal(attachment.fields[0], 'title', 'slugline');
      assert.propertyVal(attachment.fields[0], 'value', 'POLICE Collision');
      assert.propertyVal(attachment.fields[1], 'title', 'Methode Name');
      assert.propertyVal(attachment.fields[1], 'value', '28PACOLLISION1');
      assert.propertyVal(attachment.fields[2], 'title', 'News Item ID');
      assert.propertyVal(attachment.fields[2], 'value', 'PA-HHH-POLICE-Collision');
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
      // console.dir(data);
      assert(data.type === 'Reuters', 'Ensure type is Reuters.');
      assert(data.attachments.length === 1, 'There is one article.')
      
      var attachment = data.attachments[0];
      assert.propertyVal(attachment, 'fallback', 'HEADLINE HEADLINE HEADLINE [2] -- BODY COPY');
      assert.propertyVal(attachment, 'color', '#ff8000');
      assert.propertyVal(attachment, 'title', 'HEADLINE HEADLINE HEADLINE [2]');
      assert.propertyVal(attachment, 'pretext', '@everyone');
      assert.propertyVal(attachment, 'text', 'BODY COPY\n(Reporting by FIRSTNAME LASTNAME; writing by FIRSTNAME LASTNAME; editing by FIRSTNAME LASTNAME)');
      assert.propertyVal(attachment, 'author_name', 'Thomson Reuters');
      assert.propertyVal(attachment, 'author_link', 'http://about.reuters.com/');
      //assert.propertyVal(attachment, 'author_icon', '');
      assert(attachment.fields.length === 3, 'Ensure there are two fields');
      assert.propertyVal(attachment.fields[0], 'title', 'slugline');
      assert.propertyVal(attachment.fields[0], 'value', 'PLACE-TOPIC/SUBJECT (URGENT)');
      assert.propertyVal(attachment.fields[1], 'title', 'Methode Name');
      assert.propertyVal(attachment.fields[1], 'value', '28RTURGENT');
      assert.propertyVal(attachment.fields[2], 'title', 'News Item ID');
      assert.propertyVal(attachment.fields[2], 'value', 'ABCDEFGH');
      done();
    })
    .catch(function(err) {
      // fail() called
      done(err);
    });
  });
  
  
});
