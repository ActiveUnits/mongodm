var sys = require('sys');
var mongo = require("mongodb");
var CollectionFacade = require("./CollectionFacade");
var Document = require("./Document");
var chainbuilder = require("./utils/chainbuilder");
var fargs = require("./utils/function").fargs;

var DatabaseFacade = function() {
	this.db = null;
	this.collections = {};
	this.documents = {};
};

var chain = chainbuilder.createChain(DatabaseFacade.prototype);

chain.defineMethod("allocate", function(dbname, host, port, callback) {
	fargs(arguments)
		.required(new Error("dbname required"))
		.skipAsValue("localhost")
		.skipAsValue(27017)
		.skipAsFunction(null);
	
	var _self = this;
	var db = new mongo.Db(dbname, new mongo.Server(host, port, {}));
	db.on("error", function(err){
		if(callback)
			callback(err,null);
		else
			throw err;
	});
	db.open(function(err, db){
		_self.db = db;
		if(callback)
			callback(null, db);
	});
});

chain.defineFork("withCollection", function(name, asynchMode, callback) {
	fargs(arguments)
		.required(new Error("name required"))
		.skipAsValue(false)
		.skipAsFunction(null);
	
	var _self = this;
	var collectionFacade = new CollectionFacade();
	collectionFacade.db = this.db;
	collectionFacade.asynch(asynchMode);
	if(typeof this.collections[name] == "undefined") {
		return collectionFacade.allocate(name, function(err,collection){
			_self.collections[name] = collection;
			callback(err,collection);
		});
	} else {
		collectionFacade.collection = this.collections[name];
		return collectionFacade;
	}
});

chain.defineMethod("drop", function(callback){
	fargs(arguments)
		.skipAsFunction(null);
	
	this.db.dropDatabase(callback);
});

chain.defineMethod("close", function(callback) {
	fargs(arguments)
		.skipAsFunction(null);

	this.db.on("close", callback);
	this.db.close();
	this.db = null;
});

chain.defineMethod("withDocument" , function(name, definition) {
	fargs(arguments)
		.required(new Error("name required"))
		.skipAsValue(null);

	if(definition != null) {
		this.documents[name] = new Document(this.db);
		this.documents[name].compileFacade(name, definition);
	}
	
	if(typeof this.documents[name] == "undefined")
		throw new Error(name+" needs at least one definition to be document, use withDocument(name, definitionObject) first. ");
	
	return this.documents[name].facade;
});

chain.finalizeWith("end");

module.exports = DatabaseFacade;