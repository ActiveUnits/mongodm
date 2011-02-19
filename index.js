var mongo = require("mongodb");
var fargs = require("./lib/utils/function").fargs;
var DatabaseFacade = require("./lib/DatabaseFacade");

exports.withDatabase = function(dbname, host, port, callback) {
	fargs(arguments)
		.required(new Error("dbname required"))
		.skipAsValue("localhost")
		.skipAsValue(27017)
		.skipAsFunction(null);
	
	var db = new mongo.Db(dbname, new mongo.Server(host, port, {}), {native_parser:true});
	db.open(function(){
		if(callback != null)
			callback(null, new DatabaseFacade(db));
	});
	db.on("error", function(err){
		callback(err,null);
	});
};