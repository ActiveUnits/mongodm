var mongo = require("mongodb");
var EventEmitter = require("events").EventEmitter;
var sys = require('sys');
var Transaction = require("./transaction");

var DBClient = function() {
	this.db = null;
};

DBClient.prototype.open = function(dbname, host, port, callback) {
	
	if(typeof host == "function") {
		callback = host;
		host = "localhost";
		port = 27017;
	}
	else
	if(typeof port == "function") {
		callback = port;
		port = 27017;
	}
	
	if(this.client != null) {
		this.client.close();
		this.client = null;
	}
	
	var _self = this;
	this.db = new mongo.Db(dbname, new mongo.Server(host, port, {}));
	this.db.open(function(){
		if(typeof callback != null)
			callback(null,_self);
	});
};

DBClient.prototype.close = function(callback) {
	if(this.db != null) {
		this.db.on("close", function(){
			if(typeof callback != "undefined")
				callback(null);
		});
		this.db.close();
		this.db = null;
	}
	else
		if(typeof callback != "undefined")
			callback(null);
};

DBClient.prototype.withCollection = function(name, callback) {
	if(this.db == null)
		throw new Error("not connected");
	
	var transaction = new Transaction(this.db);
	return transaction.allocateCollection(name,callback);
};

DBClient.prototype.dropCollection = function(name, callback) {
	if(this.db == null)
		throw new Error("not connected");
	
	this.db.dropCollection(name, callback);
};

module.exports = DBClient;