var sys = require("sys");
var fargs = require("./utils/function").fargs;
var DocumentFacade = require("./DocumentFacade");

var Document = function(db) {
	this.db = db;
	this.facade = null;
};

Document.prototype.compileFacade = function(collectionName, documentDefinition) {
	this.facade = DocumentFacade(this.db, documentDefinition);
	
	var _self = this;
	
	// createCollection only upon compiling facade... 
	this.db.createCollection(collectionName, function(err, collection){
		if(err == null)
			_self.facade.setTargetCollection(collection);
		else
			_self.facade.emit("error", err);
	});
	
	// return documentFacade ready to recieve operations which will be executed only once the collection is created.
	return this.facade;
};

module.exports = Document;