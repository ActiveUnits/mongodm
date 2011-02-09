var fargs = require("./lib/utils/function").fargs;
var chainbuilder = require("./lib/utils/chainbuilder");
var DatabaseFacade = require("./lib/DatabaseFacade");
var sys = require("sys");

chainbuilder.createChain(exports)
			.defineFork("withDatabase", function(dbname, host, port, asynch, callback) {
				fargs(arguments)
					.required(new Error("dbname required"))
					.skipAsValue("localhost")
					.skipAsValue(27017)
					.skipAsValue(false)
					.skipAsFunction(null);
			
				var databaseFacade = new DatabaseFacade();
				databaseFacade.asynch(asynch).allocate(dbname, host, port, function(err, db){
					if(callback)
						callback(err, databaseFacade);
				});
				return databaseFacade;
			})
			.finalizeWith("end");