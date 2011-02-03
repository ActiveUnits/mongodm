var sys = require("sys");
var fargs = require("./utils/function").fargs;

var CollectionFacade = function(db,collection,asynchMode,callback) {
	fargs(arguments)
		.required(new Error("could not create transaction without db connection"))
		.required(new Error("could not operation without collection name"))
		.skipAsValue(true)
		.skipAsFunction(null);
	
	this.db = db;
	this.asynchMode = asynchMode;
	this.executing = false;
	
	this.collection = null;
	this.pendingOperations = [];
	this.endCallback = null;
	
	var _self = this;
	
	if(typeof collection == "string") {
		this.collectionName = collection;
		this.db.createCollection(collection, function(err, collection){
			if(callback != null)
				callback(err, collection);
			 
			if(err == null) {
				_self.collection = collection;
				if(_self.asynchMode == true)
					executePendingOperationsAsynch.call(_self);
				else
					executePendingOperationsInChain.call(_self, _self.endCallback);
			}
		});
	} else if(typeof collection == "object") {
		this.collectionName = collection.collectionName;
		this.collection = collection;
		if(this.asynchMode == true)
			executePendingOperationsAsynch.call(this);
		else
			executePendingOperationsInChain.call(this, this.endCallback);
	}
};

CollectionFacade.prototype.isBufferingOperations = function() {
	return (this.collection == null || this.asynchMode == false) && this.executing == false;
};

CollectionFacade.prototype.end = function(callback) {
	if(this.asynchMode == true)
		throw new Error("can not call end when not in synch mode");
	
	if(callback)
		if(this.collection != null)
			executePendingOperationsInChain.call(this, callback);
		else
			this.endCallback = callback;
	else
		throw new Error("callback must be function");
};

var executePendingOperationsAsynch = function() {
	var _self = this;
	
	this.pendingOperations.forEach(function(operation){
		_self[operation.method].apply(_self, operation.args);
	});
	
	this.pendingOperations = [];
};

var executePendingOperationsInChain = function(finalCallback) {
	
	//sys.log("executing in chain: "+sys.inspect(this.pendingOperations));
	var _self = this;
	var _currentIndex = 0;
	var _results = [];
	
	// setting this flag will stop buffering execution of the commands, 
	// and will force operations to be executed immediately on the collection
	this.executing = true;  
	
	if(_currentIndex >= _self.pendingOperations.length) {
		finalCallback(new Error("no pending operations found"));
		return;
	}
	
	var clearTransactionBuffers = function() {
		_self.pendingOperations = [];
		_self.endCallback = null;
		_self.executing = false;
	};
	
	var executeCurrentOperation = function() {
		var operation = _self.pendingOperations[_currentIndex]; 
		//sys.log("current operation "+sys.inspect(operation));
		
		// inject last operation argument, 
		// if it is missing then new operation handler will be set to collect the result
		fargs(operation.args)
			.lastAsFunction(function(f){
				return function(err, result){
					//sys.log("operation finished "+sys.inspect(operation));
					
					if(err == null) {
						
						// store result to ordered list
						if(typeof result != "undefined")
							_results.push(result);
						else
							_results.push(null); // in case there is no result, always push null.
						
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
			
		//sys.log("executing "+operation.method+" with args "+sys.inspect(operation.args));
		
		// finally call the operation itself
		_self[operation.method].apply(_self, operation.args);
	};
	
	/// execute current operation (first) and thus fall into recursion above...
	executeCurrentOperation();
};


// create possible commands
['insert', 'remove', 'save', 'update', 'count', 'find', 'findOne'].forEach(function(command){
	CollectionFacade.prototype[command] = function() {
		
		if(this.isBufferingOperations()) {
			//sys.log("buffering "+command+" "+sys.inspect(arguments));
			var operation = {};
			var args = [];
			for(var i in arguments)
				args[i] = arguments[i];
			operation.method = command;
			operation.args = args;
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
			
			// normalize commands and inject save mode for every one
			if(command == "remove" || command == "save" || command == "update" || command == "insert") {
				fargs(arguments)
					.required(new Error("at least one argument is required for "+command)) 
					.mixValueWith(function(value){ // options
						if(value == null)
							value = {};
						value['safe'] = true;
						return value;
					})
					.skipAsFunction(undefined);
			}
				
			//sys.log("executing for real "+command+" "+sys.inspect(arguments));
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
		
		if(this.asynchMode == true)
			throw new Error("could not set options value on last operation because asynchMode is true");
		
		var operation = this.pendingOperations[this.pendingOperations.length-1];
		if(operation.method == "find") {
			// normalize findArguments
			fargs(operation.args)
				.skipAsValue({}) // selector/pattern
				.mixValueWith(function(value){ // options
					if(value == null)
						value = {};
					return value[option] = value;
				})
				.skipAsFunction(undefined);
		}
		
		return this;
	};
});

CollectionFacade.prototype.drop = function(callback) {
	if(this.isBufferingOperations()) {
		
		var operation = {};
		var args = [];
		for(var i in arguments)
			args[i] = arguments[i];
		operation.method = 'drop';
		operation.args = args;
		this.pendingOperations.push(operation);
		
	} else {
		
		this.db.dropCollection(this.collectionName, callback);
		this.collection = null;
		this.collectionName = null;
	}
	
	return this;
};

module.exports = CollectionFacade;