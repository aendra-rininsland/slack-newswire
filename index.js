'use strict';

/**
 * POSTs newswire stories to Slack via an incoming webhook.
 * 
 * @author Ændrew Rininsland      <aendrew@aendrew.com>
 * @since  30 Aug. 2015
 */

// module dependencies
var xml2js = require('xml2js');
var xpath = require('xml2js-xpath');
var scale = require('d3-scale');
var format = require('util').format;

/**
 * The handler function.
 * 
 * @param {object}  event       The data regarding the event.
 * @param {object}  context     The AWS Lambda execution context.
 */
exports.handler = function(event, context) {
  /**
   * Parses an old NewsML XML file (Press Association)
   */
  function parseArticle(article, type, priority) {
    var color = scale.linear().domain([8, 3, 1]).range(['green', 'yellow', 'red']);
    var headline = xpath.evalFirst(article, '//headline');
    var body = xpath.evalFirst(article, '//body');
    var bodyCopy, excerpt, byline, link, newsitem;
    
    if (body.hasOwnProperty('body.content')) { // PA
      excerpt = bodyCopy = body['body.content'][0].p[0];
      bodyCopy = body['body.content'][0].p.join('\n');
      byline = xpath.evalFirst(article, '//byline').replace('By ', '');
      link = 'https://www.pressassociation.com/';
      newsitem = xpath.evalFirst(article, '//newsitemid');
    } else { // Reuters
      excerpt = body.p[0];
      bodyCopy = body.p.join('\n');
      // var authors = body.p[body.p.length - 1];
      byline = 'Thomson Reuters'; // TODO write some regex to extract reporter's name.
      link = 'http://about.reuters.com/';
      newsitem = article.$.guid.split(':')[2].replace('newsml_', '');
    }
    
    return {
      fallback: format('%s [%d] -- %s', headline, priority, excerpt),
      color: color(priority),
      title: format('%s [%d]', headline, priority),
      pretext: priority <= 3 ? '@everyone' : '',
      text: bodyCopy,
      author_name: byline,
      author_link: link,
      fields: [
        {
          title: 'slugline',
          value: xpath.evalFirst(article, '//slugline', true)
        },
        {
          title: 'Methode Name',
          value: undefined
        },
        {
          title: 'News Item ID',
          value: newsitem
        }
      ]
    };
  }
  
  xml2js.parseString(event.body, {normalizeTags: true}, function(err, xml){
    var type;
    var payload = {
      text: String(),
      attachments: []
    };
  
    var articles = xpath.find(xml, '//newsitem');
    var priority = xpath.evalFirst(xml, '//priority');
    var metadataProperties = xpath.find(xml, '//nimetadata/property');
    var methode = metadataProperties.filter(function(v){
      return v.$.FormalName === 'NIMethodeName';
    })[0].$.Value;
      
    if (xml.hasOwnProperty('newsmessage')) { // Reuters, expectedly, uses the modern version.
      type = 'Reuters';
    } else if (xml.hasOwnProperty('newsml')) { // PA, regrettably, does not.
      type = 'PA';
      priority = priority.$.FormalName;
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
    
    context.succeed(payload);
  });  
};
