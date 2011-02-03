var sys = require("sys");
var fargs = require("./utils/function").fargs;

var CollectionFacade = function(db,collectionName,chainMode,callback) {
	fargs(arguments)
		.required(new Error("could not create transaction without db connection"))
		.required(new Error("could not operation without collection name"))
		.skipAsValue(false)
		.skipAsFunction(null);
	
	this.db = db;
	this.chainMode = chainMode;
	this.chainExecuting = false;
	this.collectionName = collectionName;
	
	this.collection = null;
	this.pendingOperations = [];
	this.endCallback = null;
	
	var _self = this;
	this.db.createCollection(collectionName, function(err, collection){
		if(callback != null)
			callback(err, collection);
		 
		if(err == null) {
			_self.collection = collection;
			if(_self.chainMode == false)
				executePendingOperationsAsynch.call(_self);
			else
				executePendingOperationsInChain.call(_self, _self.endCallback);
		}
	});
};

var executePendingOperationsAsynch = function() {
	var _self = this;
	
	this.pendingOperations.forEach(function(operation){
		for(var k in operation)
			_self[k].apply(_self, operation[k]);
	});
	
	this.pendingOperations = [];
};

var executePendingOperationsInChain = function(finalCallback) {
	var _self = this;
	var _currentIndex = 0;
	var results = [];
	
	// setting this flag will stop buffering execution of the commands, 
	// and will force operations to be executed immediately on the collection
	this.chainExecuting = true;  
	
	if(_currentIndex >= _self.pendingOperations.length) {
		finalCallback(new Error("no pending operations found"));
		return;
	}
	
	var clearTransactionBuffers = function() {
		_self.pendingOperations = [];
		_self.endCallback = null;
		_self.chainExecuting = false;
	}
	
	var executeCurrentOperation = function() {
		var operation = _self.pendingOperations[_currentIndex]; 
		
		// inject last operation argument, 
		// if it is missing then new operation handler will be set to collect the result
		fargs(operation)
			.lastAsFunction(function(f){
				return function(err, result){
					if(err == null) {
						
						// store result to ordered list
						_results.push(result);
						
						// call the local callback of the operation.
						if(f != null)
							f(err, result); 
						
						// advance current operation index
						_currentIndex += 1; 
						
						
						if(_currentIndex >= _self.pendingOperations.length) {
							
							// clear all buffers as the transaction finished executing all operations
							clearTransactionBuffers();
							
							// prepend the error marker
							_results.unshift(null); 
							
							// call the final callback with aggregated ordered results list
							finalCallback.apply(_self, _results);
						} else 
							executeCurrentOperation();
					}
					else {
						// clear all buffers as the transaction failed executing all operations
						clearTransactionBuffers();
						finalCallback(err); // stop execution and notify final callback
					}
				};
			});
		
		// finally call the operation itself
		for(var k in operation)
			_self[k].apply(_self, operation[k]);
	};
	
	/// execute current operation (first) and thus fall into recursion above...
	executeCurrentOperation();
};

var setPendingOperationOption = function(operation, option, value) {
	
	if(typeof operation['find'] != "undefined") { // for find operation
		
		var findArguments = operation['find'];
		
		// normalize findArguments
		fargs(findArguments)
			.skipAsValue({}) // selector/pattern
			.mixValueWith(function(value){ // options
				if(value == null)
					value = {};
				return value[option] = value;
			})
			.skipAsFunction(undefined);
		
		// give back the arguments
		operation['find'] = findArguments;
	}
};

// create possible commands
['insert', 'remove', 'save', 'update', 'count', 'find', 'findOne'].forEach(function(command){
	CollectionFacade.prototype[command] = function() {
		
		if((this.collection == null || this.chainMode == true) && this.chainExecuting == false) {
			
			var operation = {};
			var args = [];
			for(var i in arguments)
				args[i] = arguments[i];
			operation[command] = args;
			this.pendingOperations.push(operation);
			
		} else {
			
			// augment find command so that it returns always results not cursor.
			if(command == "find") {
				fargs(arguments)
					.lastAsFunction(function(f){
						return function(err, cursor){
							if(err == null)
								cursor.toArray(function(err, results){
									if(f)
										f(err, results);
								});					
							else
								if(f)
									f(err,null);
						};
					});
			}
			
			// execute the command on the collection
			this.collection[command].apply(this.collection, arguments);
		}
		
		return this;
	};
});

['limit','skip','sort','fields','timeout'].forEach(function(option){
	CollectionFacade.prototype[option] = function(value) {
		if(typeof value == "undefined")
			return;
		
		if(this.chainMode == false)
			throw new Error("could not set options value on last operation because chainMode is false");
		
		setPendingOperationOption(this.pendingOperations[this.pendingOperations.length-1], option, value);
	};
});

CollectionFacade.prototype.end = function(callback) {
	if(callback)
		if(this.collection != null)
			executePendingOperationsInChain.call(this, callback);
		else
			this.endCallback = callback;
	else
		throw new Error("callback must be function");
};

CollectionFacade.prototype.drop = function(callback) {
	this.db.dropCollection(this.collectionName, callback);
	this.collection = null;
	this.collectionName = null;
};

module.exports = CollectionFacade;