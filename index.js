var fargs = require("./lib/utils/function").fargs;
var chainbuilder = require("./lib/utils/chainbuilder");
var DatabaseFacade = require("./lib/DatabaseFacade");
var mongo = require("mongodb");
var sys = require("sys");

exports.databases = new (require("./lib/ObjectsPool"));

chainbuilder.createChain(exports)
			.defineMethod("withDatabase", function(dbname, host, port, asynch, callback) {
				fargs(arguments)
					.required(new Error("dbname required"))
					.skipAsValue("localhost")
					.skipAsValue(27017)
					.skipAsValue(true)
					.skipAsFunction(null);
				
				var databaseFacade = (new DatabaseFacade()).asynch(asynch);
				var _self = this;
				if(this.databases.get(host+dbname+port) == null) {
					
					var db = new mongo.Db(dbname, new mongo.Server(host, port, {}));
					db.open(function(err, db){
						if(err == null) {
							databaseFacade.db = db;
							_self.databases.set(host+dbname+port, {db: databaseFacade.db, collections: databaseFacade.collections});
						}
						
						if(callback)
							callback(err, databaseFacade);
					});
					
				} else {
					databaseFacade.db = this.databases.get(host+dbname+port).db;
					databaseFacade.collections = this.databases.get(host+dbname+port).collections;
					
					if(callback)
						callback(null, databaseFacade);
				}
			})
			.finalizeWith("end");