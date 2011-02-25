//profiled manually using v8-profiler & node-inspector (install via npm)
var sys = require("sys");
var vows = require("vows");
var assert = require('assert');
var EventEmitter = require("events").EventEmitter;

var mongo = require("mongodb");
var db = new mongo.Db("nodebench2", new mongo.Server("127.0.0.1", 27017, {}), {native_parser:true});
db.open(function(err, db){
	db.collection("testData", function(err, collection){

		var header = {'Content-Type': 'text/plain'};
		var http = require('http');
		http.createServer(function (req, res) {
			
				  res.writeHead(200, header);
				  var count = 0;
				  collection.find({},{limit: 100, batchSize: 100},function(err, cursor){
				  	cursor.toArray(function(err, objs){
				  		res.end(objs.length.toString());
				  	});
				  });
				
		}).listen(8124);
		console.log('Server running at http://127.0.0.1:8124/');
	});
});

