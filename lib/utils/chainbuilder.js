var fargs = require("./function").fargs;
var sys = require("sys");

var ChainBuilder = function(context) {
	var _self = this;
	
	// this isn't quite good solution... 
	context.synch = function(value){
		this.__synch = value;
		return this;
	};
	
	context.end = function(synch, handler) {
		fargs(arguments)
			.skipAsValue(this.__synch)
			.skipAsFunction(undefined);
		
		// skip execute if there are no pending operations
		if(typeof this.__pendingOperations == "undefined" || this.__pendingOperations.length == 0) {
			if(handler)
				handler(new Error("no operations pending to be executed"));
			return;
		}
		
		//sys.log("EXECUTING OPS "+sys.inspect(this.__pendingOperations));
		if(!synch)
			_self.executeAsynch(this.__pendingOperations, handler);
		else
			_self.executeSynch(this.__pendingOperations, handler);
		
		this.__pendingOperations = null;
		this.__synch = null;
		delete this.__pendingOperations;
		delete this.__synch;
		
		return this;
	};
	
	this.defineFork = function(name, handler) {
		fargs(arguments)
			.required(new Error("name required"))
			.required(new Error("function is required"));
		
		context[name] = function() {
			return handler.apply(this, arguments);
		};
	};
	
	// string name, gatherResults, function method(<arguments passed to name>, function methodHandler(err, <any set of results>))
	this.defineMethod = function(name, gatherResults,  handler) {
		fargs(arguments)
				.required(new Error("name required"))
				.skipAsValue(true)
				.required(new Error("function is required"));
		
		context[name] = function(){
			var args = [];
			for(var i in arguments)
				args[i] = arguments[i];
			
			if(!this.__synch) {
				handler.apply(this, args);
				return this;
			}
			
			var operation = {};
			operation.name = name;
			operation.method = handler;
			operation.args = args;
			operation.context = this;
			operation.gatherResults = gatherResults;
			
			if(typeof this.__pendingOperations == "undefined")
				this.__pendingOperations = [];
			
			this.__pendingOperations.push(operation);
			//sys.log("adding as pending operation "+name+" -> "+sys.inspect(this.__pendingOperations));
			
			return this;
		};
		
		return this;
	};
	
	// string name, function option(lastSetOpration, <any args passed to name>) 
	this.defineMethodOption = function(name, handler) {

		var _self = this;
		context[name] = function() {
			if(!this.__synch)
				throw new Error("could not set options value on last operation. try executing the chain in synch mode.");
			
			var args = [];
			for(var i in arguments)
				args[i] = arguments[i];
			
			// inject the last set operation as first argument always.
			args.unshift(this.__pendingOperations[this.__pendingOperations.length-1]);
			
			// execute handler immediately
			handler.apply(this, args);
			
			return this;
		};
		
		return this;
	};
	
	this.executeAsynch = function(pendingOperations, finalCallback) {
		
		var _currentIndex = 0;
		var _results = [];
		
		pendingOperations.forEach(function(operation){
			
			if(operation.gatherResults)
				// inject last operation argument, 
				// if it is missing then new operation handler will be set to collect the result
				fargs(operation.args)
					.lastAsFunction(function(f){
						return function(err){
							//sys.log("asynch operation finished "+sys.inspect(operation)+" with "+sys.inspect(arguments));
							
							if(err == null) {
								
								var args = [err];
								
								// store result to ordered list
								if(arguments.length > 1) {
									for(var i = 1; i<arguments.length; i++){ // skip err argument as it is mandatory 
										_results.push(arguments[i]);
										args.push(arguments[i]);
									}
								}
								else
									_results.push(null); // in case there is no result, always push null as placeholder
								
								// call the local callback of the operation.
								if(f != null)
									f.apply(this, args);
								
								// advance current operation index
								_currentIndex += 1; 
								
								if(_currentIndex >= pendingOperations.length) {
									
									// prepend the error marker
									_results.unshift(null); 
									
									// call the final callback with aggregated ordered results list
									if(finalCallback)
										finalCallback.apply(this, _results);
								}
							} else {
								/// stop execution and notify final callback in asynch is not possible... 
								// so just call finalCallback
								if(finalCallback)
									finalCallback.apply(this, [err]);
							}
						};
					});
			else
				_currentIndex += 1; // advance currentIndex as the operation results gathering is skipped
			
			//sys.log("executing asynch "+sys.inspect(operation)+" | "+sys.inspect(_self.pendingOperations));
			
			operation.method.apply(operation.context, operation.args);
		});
	};
	
	this.executeSynch = function(pendingOperations,finalCallback) {
		
		//sys.log("executing in chain: "+sys.inspect(this.pendingOperations));
		var _self = this;
		var _currentIndex = 0;
		var _results = [];
		
		
		var executeCurrentOperation = function() {
			var operation = pendingOperations[_currentIndex]; 
			//sys.log("current operation "+sys.inspect(operation));
			
			if(operation.gatherResults)
				// inject last operation argument, 
				// if it is missing then new operation handler will be set to collect the result
				fargs(operation.args)
					.lastAsFunction(function(f){
						return function(err){
							//sys.log("synch operation finished "+operation.name);
							
							if(err == null) {
								
								var args = [err];
								
								// store result to un-ordered list
								if(arguments.length > 1) {
									
									// starting from 1 -> skips err argument as it is mandatory
									for(var i = 1; i<arguments.length; i++){  
										_results.push(arguments[i]);
										args.push(arguments[i]);
									}
								}
								else
									_results.push(null); // in case there is no result, always push null as placeholder
								
								// call the local callback of the operation.
								if(f != null)
									f.apply(this, args);
								
								// advance current operation index
								_currentIndex += 1; 
								
								if(_currentIndex >= pendingOperations.length) {
									// prepend the error marker
									_results.unshift(null); 
									// call the final callback with aggregated ordered results list
									if(finalCallback)
										finalCallback.apply(this, _results);
								} else 
									executeCurrentOperation(); // synch in recursion...  
							}
							else {
								if(finalCallback)
									finalCallback.apply(this, [err]); // stop execution and notify final callback
							}
						};
					});
			else
				_currentIndex += 1; // advance currentIndex as the operation results gathering is skipped
				
			//sys.log("synch executing "+operation.name);
			
			// finally call the operation itself
			operation.method.apply(operation.context, operation.args);
		};
		
		/// execute current operation (first) and thus fall into recursion above...
		executeCurrentOperation();
	};
};

exports.createChain = function(context) {
	return new ChainBuilder(context);
};
