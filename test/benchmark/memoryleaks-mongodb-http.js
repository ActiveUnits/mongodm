//profiled manually using v8-profiler & node-inspector (install via npm)
var sys = require("sys");
var vows = require("vows");
var assert = require('assert');
var EventEmitter = require("events").EventEmitter;
var profiler = require('v8-profiler');

var mongo = require("mongodb");

var db = new mongo.Db("testdb2", new mongo.Server("localhost", 27017, {}), {native_parser:true});
db.open(function(err, db){
		var header = {'Content-Type': 'text/plain'};
		var http = require('http');
		http.createServer(function (req, res) {
			db.collection("User", function(err, collection){
			  res.writeHead(200, header);
			  //profiler.takeSnapshot('beforeFind');
			  collection.find({},{limit: 100},function(err, cursor){
				  //profiler.takeSnapshot('afterFind');
				  cursor.toArray(function(err, objs){
					  res.end(JSON.stringify(objs));  
					  cursor.close();
					  //profiler.takeSnapshot('afterRequest');
				  });
			  });
			});
		}).listen(8124);
		console.log('Server running at http://127.0.0.1:8124/');
	
});

