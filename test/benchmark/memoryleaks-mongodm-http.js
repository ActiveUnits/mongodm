//profiled manually using v8-profiler & node-inspector (install via npm)
var sys = require("sys");
var vows = require("vows");
var assert = require('assert');
var EventEmitter = require("events").EventEmitter;

var mongodm = require("../../index");

var UserDocumentDefinition = {
		instance: {
			fields: {
				username: "",
				password: "",
				createdAt: null,
				lastLoginDate: null,
				deleted: false,
				deeply: {
					nested: {
						property: {
							value: "default"
						},
						nested: {
							value: "default2"
						}
					}
				}
			},
			on: {
				save: function() {
					if(this.createdAt == null)
						this.createdAt = new Date();
				}
			}
		}
	};

var saveNewDocument = function(db){
	var promise = new EventEmitter();
	
	var user = new (db.withDocument("User"));
	user.username = "TestUser";
	user.deeply.nested.property.value = "TEST"; 
	
	user.save(function(){
		user.username = "TestUserUpdated";
		user.deeply.nested.nested.value = "TEST123123";
		user.deeply.nested.property.value = "TEST123123";
		
		user.save(function(err, obj){
			promise.emit("success", err, obj);
		});
	});
	
	return promise;
};

mongodm.withDatabase("testdb2",function(err,db){
	var profiler = require('v8-profiler');
	db.withDocument("User", UserDocumentDefinition);
	
	var http = require('http');
	http.createServer(function (req, res) {
	  if(req.url == "/generate") {
			var count = 100;
			var current = 0;
			var handleSave = function(){
				current += 1;
				if(current >= count) {
					res.writeHead(200, {'Content-Type': 'text/plain'});
					res.end("generated "+count);
				}
			};
			
			for(var i = 0; i<count; i++)
				saveNewDocument(db).on("success", handleSave);
	  } else {
		  res.writeHead(200, {'Content-Type': 'text/plain'});
		  db.withDocument("User")
		  	.find({},{limit: 100},function(err, objs){
		  		res.end(JSON.stringify(objs));
		  	});
	  }
	}).listen(8124);
	console.log('Server running at http://127.0.0.1:8124/');
});

