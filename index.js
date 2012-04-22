var fargs = require("./lib/utils/function").fargs;
var chainbuilder = require("./lib/utils/chainbuilder");
var DatabaseFacade = require("./lib/DatabaseFacade");
var mongo = require("mongodb");
var sys = require("sys");

exports.databaseConnections = new (require("./lib/ObjectsPool"));

chainbuilder.createChain(exports)
			.defineMethod("withDatabase", function(dbname, host, port, callback) {
				fargs(arguments)
					.required(new Error("dbname required"))
					.skipAsValue("localhost")
					.skipAsValue(27017)
					.skipAsFunction(null);
				
				var _self = this;
				var dbfacade = this.databaseConnections.get(host+dbname+port);
				if(dbfacade == null) {
					var db = new mongo.Db(dbname, new mongo.Server(host, port, {}));
					db.open(function(err, db) {
						var databaseFacade = (new DatabaseFacade());
						if(err == null) {
							databaseFacade.db = db;
							_self.databaseConnections.set(host+dbname+port, databaseFacade);
						}
						
						if(callback)
							callback(err, databaseFacade);
					});
					db.on("close",function(){
						_self.databaseConnections.set(host+dbname+port, null);
					});
				} else {
					callback(null, dbfacade);
				}
			});
