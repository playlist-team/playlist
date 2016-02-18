var express = require('express');
var app = express();

var port = process.env.PORT || 3000;

app.use('/', express.static("./public"));

app.get('/', function (req, res) {
  //res.send('Hello World!');
});

app.listen(port);