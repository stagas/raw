/*
 * raw text paste service for your cross-domain hacking pleasures
 *
 * by stagas
 *
 * MIT licenced
 */

var config = {
  host: process.env.HOST || 'localhost'
, port: process.env.PORT || 8080
}

var raw = require('./raw')('files')
  , express = require('express')
  , app = express.createServer()

app.use(express.bodyDecoder())

var index = new Buffer([
  '<doctype html>'
, '<html><head>'
, '<title>raw text sharing</title>'
, '</head><body style="width:100%+;height:100%+;">'
, '<h1>Paste your text and press submit:</h1>'
, '<form action="/" method="post">'
, '<textarea name="raw" style="width:100%;height:60%"></textarea>'
, '<input type="submit">'
, '</form>'
, '</body></html>'
].join(''), 'utf8')

// woo-hoo
var cross = new Buffer([
  '<?xml version="1.0"?>'
, '<!DOCTYPE cross-domain-policy SYSTEM "http://www.adobe.com/xml/dtds/cross-domain-policy.dtd">'
, '<cross-domain-policy>'
, '  <allow-access-from domain="*" />'
, '</cross-domain-policy>'
].join(''), 'utf8')

// handlers
app.get('/', function(req, res) {
  res.writeHead(200, {
    'Content-Length': index.length
  , 'Content-Type': 'text/html; charset=utf-8'
  })
  res.end(index)
})

app.get('/crossdomain.xml', function(req, res) {
  res.writeHead(200, {
    'Content-Length': cross.length
  , 'Content-Type': 'application/xml'
  })
  res.end(cross)
})

app.get('/:filename', function(req, res) {
  raw.get(req.params.filename, function(err, body) {
    if (err) return res.send('not found :(')
    res.writeHead(200, {
      'Content-Length': body.length
    , 'Content-Type': 'text/plain; charset=utf-8'
    })
    res.end(body)
  })
})

app.post('/', function(req, res) {
  if (req.body && req.body.raw) {
    raw.set(req.body.raw, function(err, filename) {
      if (err) return res.send('failed :(')
      var url = 'http://' + config.host + (config.port != 80 ? ':' + config.port : '') + '/' + filename
      console.log('New file:', url)
      res.send('<html><body><a href="{url}">{url}</a><br>{url}<br></body></html>'.replace(/{url}/g, url))
    })
  } else res.send('failed :(')
})

// run
app.listen(config.port, config.host)
