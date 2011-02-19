var sys = require('sys');
var CollectionFacade = require("./CollectionFacade");
var Document = require("./Document");
var fargs = require("./utils/function").fargs;

var DatabaseFacade = function(db) {
	this.db = db;
	this.documents = {};
};

DatabaseFacade.prototype.drop = function(callback) {
	fargs(arguments)
		.skipAsFunction(null);
	
	var _self = this;
	this.db.dropDatabase(function(err){
		if(err == null)
			_self.close(callback);
		else 
			callback(err);
	});
};

DatabaseFacade.prototype.close = function(callback) {
	fargs(arguments)
		.skipAsFunction(null);
	
	if(this.db != null) {
		this.db.on("close", function(){
			if(callback != null)
				callback(null);
		});
		
		this.db.close();
	}
};

DatabaseFacade.prototype.withCollection = function(name, asynchMode, callback) {
	fargs(arguments)
		.required(new Error("name required"))
		.skipAsValue(true)
		.skipAsFunction(null);
	
	var collectionFacade =  new CollectionFacade(this.db, asynchMode); // create collection instance
	
	this.db.createCollection(name, function(err, collection){
		if(callback)
			callback(err, collection);

		// execute any pending operations been assigned to the collectionFacade & set its target
		if(err == null)
			collectionFacade.setTargetCollection(collection); 
	});
	
	return collectionFacade; // return collection instance without collection been set, thus all operations will get buffered.
};

DatabaseFacade.prototype.allocateCollection = function(name, callback) {
	fargs(arguments)
		.required(new Error("name required"))
		.skipAsFunction(null);
	
	this.db.createCollection(name, callback);
};

DatabaseFacade.prototype.withDocument = function(name, definition) {
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
};

module.exports = DatabaseFacade;