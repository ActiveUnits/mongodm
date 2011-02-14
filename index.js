var fargs = require("./lib/utils/function").fargs;
var chainbuilder = require("./lib/utils/chainbuilder");
var DatabaseFacade = require("./lib/DatabaseFacade");
var sys = require("sys");

exports.databases = new (require("./lib/ObjectsPool"));

chainbuilder.createChain(exports)
			.defineFork("withDatabase", function(dbname, host, port, asynch, callback) {
				sys.log("here "+this);
				fargs(arguments)
					.required(new Error("dbname required"))
					.skipAsValue("localhost")
					.skipAsValue(27017)
					.skipAsValue(true)
					.skipAsFunction(null);
				
				var databaseFacade = (new DatabaseFacade()).asynch(asynch);
				
				databaseFacade.allocateWithPool(exports.databases, dbname, host, port, function(err, database){
					if(callback)
						callback(err, database);
				});
				return databaseFacade;
			})
			.finalizeWith("end");