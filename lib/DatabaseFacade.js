var sys = require('sys');
var mongo = require("mongodb");
var CollectionFacade = require("./CollectionFacade");
var chainbuilder = require("./utils/chainbuilder");
var fargs = require("./utils/function").fargs;

var DatabaseFacade = function() {
	this.collections = new (require("./ObjectsPool"));
	this.db = null;
};

var chain = chainbuilder.createChain(DatabaseFacade.prototype);

chain.defineMethod("allocateWithPool", false, function(databases, dbname, host, port, callback) {
	fargs(arguments)
		.required(new Error("databases pool required"))
		.required(new Error("dbname required"))
		.skipAsValue("localhost")
		.skipAsValue(27017)
		.skipAsFunction(null);
	
	sys.log("here allocateDatabaseFacadeWithPool");
	
	if(databases.get(host+dbname+port) == null) {
		
		var _self = this;
		var db = new mongo.Db(dbname, new mongo.Server(host, port, {}));
		
		db.on("error", function(err){
			if(callback)
				callback(err,null);
			else
				throw err;
		});
		
		db.open(function(err, db){
			sys.log("db open "+dbname);
			_self.db = db;
			databases.set(host+dbname+port, {db: _self.db, collections: _self.collections});
			if(callback)
				callback(null, db);
		});
		
	} else {
		this.db = databases.get(host+dbname+port).db;
		this.collections = databases.get(host+dbname+port).collections;
		
		if(callback)
			callback(null, this.db);
	}
});

chain.defineFork("withCollection", function(name, asynchMode, callback) {
	fargs(arguments)
		.required(new Error("name required"))
		.skipAsValue(false)
		.skipAsFunction(null);
	
	if(this.db == null)
		throw new Error("db is null, try allocating the facade.");
	
	var collectionFacade = (new CollectionFacade(this.db)).asynch(asynchMode);
	return collectionFacade.allocateWithPool(this.collections, name, function(err,collection){
		if(callback)
			callback(err,collection);
	});
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

chain.finalizeWith("end");

module.exports = DatabaseFacade;