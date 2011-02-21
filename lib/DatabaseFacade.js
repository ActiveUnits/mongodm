var sys = require('sys');
var CollectionFacade = require("./CollectionFacade");
var DocumentFacade = require("./DocumentFacade");
var chainbuilder = require("./utils/chainbuilder");
var fargs = require("./utils/function").fargs;

var DatabaseFacade = function() {
	this.collections = new (require("./ObjectsPool"));
	this.documents = new (require("./ObjectsPool"));
	this.db = null;
};

var chain = chainbuilder.createChain(DatabaseFacade.prototype);

chain.defineFork("withCollection", function(name, synchMode, callback) {
	fargs(arguments)
		.required(new Error("name required"))
		.skipAsValue(this.__synch)
		.skipAsFunction(null);
	
	if(this.db == null)
		throw new Error("db is null, try allocating the facade.");
	
	var collectionFacade = (new CollectionFacade(this.db)).synch(synchMode);
	
	if(this.collections.get(name) == null) {
		
		var _self = this;
		this.db.collection(name, function(err, collection){
			collectionFacade.collection = collection;
			_self.collections.set(name, collection);
			if(callback)
				callback(err, collectionFacade);
		});
		
	} else {
		
		collectionFacade.collection = this.collections.get(name);
		if(callback)
			callback(null, collectionFacade);
	}
	return collectionFacade;
});

chain.defineFork("withDocument", function(name, documentDefinition, callback) {
	fargs(arguments)
		.required(new Error("name required"))
		.skipAsValue(null)
		.skipAsFunction(null);
	
	if(this.db == null)
		throw new Error("db is null, try allocating the facade.");
	
	var documentFacade = null;
	if(this.documents.get(name) == null) {
		documentFacade = DocumentFacade(this.db, documentDefinition);
		
		if(this.collections.get(name) == null) {
			
			var _self = this;
			this.db.collection(name, function(err, collection){
				documentFacade.collection = collection;
				_self.collections.set(name, collection);
				_self.documents.set(name, documentFacade);
				if(callback)
					callback(err, documentFacade);
			});
			
		} else {
			
			documentFacade.collection = this.collections.get(name);
			if(callback)
				callback(null, documentFacade);
		}
	} else
		documentFacade = this.documents.get(name);
	
	return documentFacade;
});

chain.defineMethod("drop", function(callback){
	fargs(arguments)
		.skipAsFunction(null);
	
	var _self = this;
	this.db.dropDatabase(function(err){
		if(err)
			callback(err);
		else
			_self.close(callback);
	});
});

chain.defineMethod("close", function(callback) {
	fargs(arguments)
		.skipAsFunction(null);
	var _self = this;
	this.db.on("close", function(){
		callback(null, _self);
	});
	this.db.close();
	this.db = null;
});

module.exports = DatabaseFacade;