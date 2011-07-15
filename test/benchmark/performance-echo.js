var header = {'Content-Type': 'text/plain'};
var http = require('http');
http.createServer(function (req, res) {
			
  res.writeHead(200, header);
  res.end("done");
		
}).listen(8124);
console.log('Server running at http://127.0.0.1:8124/');
