var DBClient = require("./lib/dbclient");

exports.createClient = function(dbname, host, port, callback) {
	var dbclient = new DBClient();
	dbclient.open(dbname, host, port, callback);
	return dbclient;
};