var sys = require("sys");

var Transaction = function(db) {
	this.db = db;
	this.collection = null;
	this.pendingOperations = [];
};

var executePendingOperations = function() {
	var _self = this;
	
	this.pendingOperations.forEach(function(operation){
		for(var k in operation)
			_self[k].apply(_self, operation[k]);
	});
	
	this.pendingOperations = [];
};

['insert', 'remove', 'save', 'update', 'count', 'find', 'findOne'].forEach(function(command){
	Transaction.prototype[command] = function() {
		if(this.collection == null) {
			var operation = {};
			var args = [];
			for(var i in arguments)
				args[i] = arguments[i];
			operation[command] = args;
			this.pendingOperations.push(operation);
		}
		else {
			this.collection[command].apply(this.collection, arguments);
		}
	};
});

Transaction.prototype.allocateCollection = function(collectionName, callback) {
	var _self = this;
	this.db.createCollection(collectionName, function(err, collection){
		if(typeof callback == "function")
			callback(err, collection);
		
		if(err == null) {
			_self.collection = collection;
			executePendingOperations.call(_self);
		}
	});
	return this;
};

module.exports = Transaction;