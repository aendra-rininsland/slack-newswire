# SlackNewswire

> POSTs newswire stories to Slack via an incoming webhook.

## Usage

1. Setup an incoming webhook integration in Slack at:

```
https://yourdomain.slack.com/services/new/incoming-webhook
```

2. Copy config-sample.env to .env
3. Set environment variables in .env
4. Do a build and deploy to AWS Lambda:

```
$ gulp deploy
```

5. Setup input mapping for type `application/xml` in AWS API Gateway:

```
{
  "body" : $input.json('$')
}
```

6. Set where-ever you ingest newswire XML to POST to the Lambda endpoint URL.

## Tests

There's a full Chai-based test suite that can be run via:

`npm test`

## Author

- Ændrew Rininsland [<aendrew@aendrew.com>]
