var sys = require('sys');
var CollectionTransaction = require("./CollectionFacade");
var fargs = require("./utils/function").fargs;

var DatabaseFacade = function(db) {
	this.db = db;
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

DatabaseFacade.prototype.withCollection = function(name, chainMode, callback) {
	return new CollectionFacade(this.db, name, chainMode, callback);
};

module.exports = DatabaseFacade;