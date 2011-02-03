var sys = require('sys');
var CollectionFacade = require("./CollectionFacade");
var DocumentFacade = require("./DocumentFacade");
var fargs = require("./utils/function").fargs;

var DatabaseFacade = function(db) {
	this.db = db;
	this.documentFacades = {};
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
	return new CollectionFacade(this.db, name, asynchMode, callback);
};

DatabaseFacade.prototype.withDocument = function(name, definition) {
	fargs(arguments)
		.required(new Error("name required"))
		.skipAsValue(null);

	if(definition != null)
		this.documentFacades[name] = new DocumentFacade(this.db, name, definition);
	
	if(typeof this.documentFacades[name] == "undefined")
		throw new Error(name+" needs at least one definition to be document ");
	
	return this.documentFacades[name].compile();
};

module.exports = DatabaseFacade;