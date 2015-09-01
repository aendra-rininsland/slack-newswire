'use strict';

/**
 * POSTs newswire stories to Slack via an incoming webhook.
 *
 * @author Ændrew Rininsland      <aendrew@aendrew.com>
 * @since  30 Aug. 2015
 */

require('dotenv').load();

// module dependencies
var libxmljs = require('libxmljs');
var scale = require('d3-scale');
var format = require('util').format;
var request = require('request');
var environment = process.env.NODE_ENV ? process.env.NODE_ENV : 'testing';

/**
 * The handler function.
 *
 * @param {object}  event       The data regarding the event.
 * @param {object}  context     The AWS Lambda execution context.
 */
exports.handler = function(event, context) {
  var IPTC_NAMESPACE = 'http://iptc.org/std/nar/2006-10-01/';

  /**
   * Returns a string value for priorities
   * @param  {integer} priority NewsML priority
   * @return {string}          Parsed priority
   */
  function getPriority(priority) {
    switch (parseInt(priority)) {
      case 1:
        return ':rotating_light: CRAZY-HIGH PRIORITY :rotating_light:';
      case 2:
        return ':rotating_light: Super high priority :rotating_light:';
      case 3:
        return 'High priority';
      case 4:
        return 'Medium priority';
      case 5:
        return 'Medium-low priority';
      case 6:
        return 'Low priority';
      case 7:
        return 'Lower priority';
      case 8:
        return 'Lowest priority';
      default:
        return 'Priority not set';

    }
  }

  var color = scale.linear().domain([8, 3, 1]).range(['green', 'yellow', 'red']);

  /**
   * Parses an old NewsML XML file (Press Association)
   */
  function parseArticle(article, type, priority) {
    var bodyCopy, excerpt, byline, link, newsitem, body, slugline, headline;

    if (type === 'PA') {
      headline = article.get('//HeadLine').text();
      body = article.get('//body');
      excerpt = body.get('//body.content').childNodes()[0].text();
      bodyCopy = '';
      body.get('//body.content').childNodes().forEach(function(node){
        bodyCopy += node.text() + '\n';
      });
      byline = article.get('//ByLine').text();
      slugline = article.get('//SlugLine').text();
      link = 'https://www.pressassociation.com/';
      newsitem = article.get('//NewsItemId').text();
    } else if (type === 'Reuters') {
      headline = article.get('//xmlns:headline', IPTC_NAMESPACE).text();
      body = article.get('//xmlns:body', 'http://www.w3.org/1999/xhtml');
      excerpt = body.childNodes()[0].text();
      bodyCopy = '';
      body.childNodes().forEach(function(node){
        bodyCopy += node.text() + '\n';
      });
      byline = 'Thomson Reuters'; // TODO write some regex to extract reporter's name.
      link = 'http://about.reuters.com/';
      slugline = article.get('//xmlns:slugline', IPTC_NAMESPACE).text();
      newsitem = article.attr('guid').value().split(':')[2].replace('newsml_', '');
    }

    if (byline) {
      byline = byline.replace('By ', '');
    }

    return {
      fallback: format('%s [%d] -- %s', headline, priority, excerpt),
      color: color(priority),
      title: format('%s', headline),
      pretext: undefined, //priority <= (process.env.ALERT_PRIORITY || 3) ? '@channel' : '', // Alert everyone for priorities above 3 (default)
      text: bodyCopy,
      author_name: byline,
      author_link: link,
      fields: [
        {
          title: 'slugline',
          value: slugline,
          short: true
        },
        {
          title: 'Methode Name',
          value: undefined,
          short: true
        },
        {
          title: 'News Item ID',
          value: newsitem,
          short: true
        },
        {
          title: 'Priority',
          value: getPriority(priority),
          short: true
        }
      ]
    };
  }

  var xml = libxmljs.parseXmlString(event.body, {noblanks: true});
  var type;
  var payload = {
    text: String(),
    attachments: []
  };

  var articles, priority, methode;
  if (xml.root().name() === 'newsMessage') { // Reuters, expectedly, uses the modern version.
    type = 'Reuters';
    articles = xml.find('//xmlns:newsItem', IPTC_NAMESPACE);
    priority = xml.get('//xmlns:priority', IPTC_NAMESPACE).text();
    methode = xml.get('//xmlns:Property[@FormalName="NIMethodeName"]', IPTC_NAMESPACE).attr('Value').value();
  } else if (xml.root().name() === 'NewsML') { // PA, regrettably, does not.
    type = 'PA';
    articles = xml.find('//NewsItem');
    priority = xml.get('//Priority');
    priority = priority.attr('FormalName').value();
    methode = xml.get('//Property[@FormalName="NIMethodeName"]').attr('Value').value();
  } else {
    throw 'Not valid NewsML';
  }

  payload.type = type;

  if (articles.length > 0) {
    articles.forEach(function(article){
      var parsed = parseArticle(article, type, priority);
      parsed.fields[1].value = methode;
      payload.attachments.push(parsed);
    });
  }

  // Send to Slack
  if (environment === 'production' && process.env.hasOwnProperty('SLACK_WEBHOOK')) {
    request.post({uri: process.env.SLACK_WEBHOOK, method: 'POST', json: payload}, function (error, response, body) {
      context.succeed(body);
    });
  } else {
    context.succeed(payload);
  }
};
