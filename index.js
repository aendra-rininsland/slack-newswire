'use strict';

/**
 * POSTs newswire stories to Slack via an incoming webhook.
 *
 * @author Ændrew Rininsland      <aendrew@aendrew.com>
 * @since  30 Aug. 2015
 */

require('dotenv').load();

// module dependencies
var cheerio = require('cheerio');
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
    var bodyCopy, 
        excerpt, 
        byline, 
        link, 
        newsitem, 
        body, 
        slugline, 
        headline, 
        bodyCopyString;
        
    article = $(article); // wrap in Cheerio
    
    if (type === 'PA') {
      headline = article.find('HeadLine').text();
      body = article.find('body').find('p');
      excerpt = body.eq(0).text();
      byline = article.find('ByLine').text();
      slugline = article.find('SlugLine').text();
      link = 'https://www.pressassociation.com/';
      newsitem = article.find('NewsItemId').text();
    } else if (type === 'Reuters') {
      headline = article.find('headline').text();
      body = article.find('body').children();
      excerpt = body.eq(0).text();
      byline = 'Thomson Reuters'; // TODO write some regex to extract reporter's name.
      link = 'http://about.reuters.com/';
      slugline = article.find('slugline').text();
      newsitem = article.attr('guid').split(':')[2].replace('newsml_', '');
    }

    bodyCopy = [];
    body.each(function(i, node){
      bodyCopy.push($(node).text());
    });
    bodyCopyString = bodyCopy.join('\n');

    if (byline) {
      byline = byline.replace('By ', '');
    }

    return {
      fallback: format('%s [%d] -- %s', headline, priority, excerpt),
      color: color(priority),
      title: format('%s', headline),
      pretext: undefined, //priority <= (process.env.ALERT_PRIORITY || 3) ? '@channel' : '', // Alert everyone for priorities above 3 (default)
      text: bodyCopyString,
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

  var $ = cheerio.load(event.body, {xmlMode: true});
  var type;
  var payload = {
    text: String(),
    attachments: []
  };
  
  var articles, priority, methode;
  var root = $.root().children('newsMessage, NewsML').get(0);
  var xml = $(root);
  
  if (root.tagName === 'newsMessage') { // Reuters, expectedly, uses the modern version.
    type = 'Reuters';
    articles = xml.find('newsItem');
    priority = xml.find('priority').text();
    methode = xml.find('Property[FormalName="NIMethodeName"]').attr('Value');
  } else if (root.tagName === 'NewsML') { // PA, regrettably, does not.
    type = 'PA';
    articles = xml.find('NewsItem');
    priority = xml.find('Priority');
    priority = priority.attr('FormalName');
    methode = xml.find('Property[FormalName="NIMethodeName"]').attr('Value');
  } else {
    throw 'Not valid NewsML';
  }

  payload.type = type;

  if (articles.length > 0) {
    articles.each(function(i, article){
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
