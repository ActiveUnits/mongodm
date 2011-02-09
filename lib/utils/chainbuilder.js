var fargs = require("./function").fargs;
var sys = require("sys");

exports.createChain = function(context) {
	return {
		pendingOperations : [],
		asynch: true,
		
		defineFork : function(name, handler) {
			
			var _self = this;
			
			context[name] = function() {
				var args = [];
				for(var i in arguments)
					args[i] = arguments[i];
				
				return handler.apply(this, args);
			};
			
			
			return this;
		},
		
		// string name, function method(<arguments passed to name>, function handler(err, <any set of results>))
		defineMethod : function(name, handler) {
			var _self = this;
			
			context[name] = function() {
				var args = [];
				for(var i in arguments)
					args[i] = arguments[i];
				
				if(_self.asynch == true) {
					handler.apply(this, args);
					return this;
				}
				
				var operation = {};
				operation.name = name;
				operation.method = handler;
				operation.args = args;
				operation.context = this;
				_self.pendingOperations.push(operation);
				
				return this;
			};
			
			return this;
		},
		
		// string name, function option(lastSetOpration, <any args passed to name>) 
		defineMethodOption : function(name, handler) {
			var _self = this;
			
			context[name] = function() {
				if(_self.asynch == true)
					throw new Error("could not set options value on last operation because is in asynch mode. try ending the chain.");
				
				var args = [];
				for(var i in arguments)
					args[i] = arguments[i];
				
				// inject the last set operation as first argument always.
				args.unshift(_self.pendingOperations[_self.pendingOperations.length-1]);
				// execute handler immediately
				handler.apply(this, args);
				
				return this;
			};
			
			return this;
		},
		
		// string name
		finalizeWith : function(endMethodName) {
			if(typeof endMethodName == "undefined")
				endMethodName = "end";
			
			var _self = this;
			context[endMethodName] = function(asynch, handler) {
				fargs(arguments)
					.skipAsValue(_self.asynch)
					.skipAsFunction(undefined);
				
				if(asynch)
					_self.executeAsynch(handler);
				else
					_self.executeSynch(handler);
				
				return this;
			};
			
			// this isn't quite good solution... 
			context['asynch'] = function(value){
				_self.asynch = value;
				return this;
			};
			
			return this;
		},
		
		executeAsynch : function(finalCallback) {
			
			if(this.executing == true) {
				finalCallback(new Error("in process of executing previous started transation. do not call end twice."));
				return;
			}
			
			// skip execute if there are no pending operations
			if(this.pendingOperations.length == 0) {
				if(finalCallback)
					finalCallback(null);
				return;
			}
			
			var _self = this;
			
			var _self = this;
			var _currentIndex = 0;
			var _results = [];
			
			// setting this flag will stop buffering execution of the commands, 
			// and will force operations to be executed immediately on the collection
			this.executing = true;  
			
			var clearTransactionBuffers = function() {
				_self.pendingOperations = [];
				_self.endCallback = null;
				_self.executing = false;
			};
			
			this.pendingOperations.forEach(function(operation){
				
				// inject last operation argument, 
				// if it is missing then new operation handler will be set to collect the result
				fargs(operation.args)
					.lastAsFunction(function(f){
						return function(err){
							//sys.log("operation finished "+sys.inspect(operation));
							
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
								
								if(_currentIndex >= _self.pendingOperations.length) {
									
									// clear all buffers as the transaction finished executing all operations
									clearTransactionBuffers();
									
									// prepend the error marker
									_results.unshift(null); 
									
									// call the final callback with aggregated ordered results list
									if(finalCallback)
										finalCallback.apply(this, _results);
								}
							}
							else {
								// clear all buffers as the transaction failed executing all operations
								clearTransactionBuffers();
								/// stop execution and notify final callback in asynch is not possible... 
								// so just call finalCallback
								if(finalCallback)
									finalCallback.apply(this, [err]);
							}
						};
					});
				
				operation.method.apply(operation.context, operation.args);
			});
		},
		
		executeSynch : function(finalCallback) {
			
			if(this.executing == true) {
				finalCallback(new Error("in process of executing previous started transation. do not call end twice."));
				return;
			}
			
			// skip execute if there are no pending operations
			if(this.pendingOperations.length == 0) {
				if(finalCallback)
					finalCallback(null);
				return;
			}
			
			//sys.log("executing in chain: "+sys.inspect(this.pendingOperations));
			var _self = this;
			var _currentIndex = 0;
			var _results = [];
			
			// setting this flag will stop buffering execution of the commands, 
			// and will force operations to be executed immediately on the collection
			this.executing = true;  
			
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
						return function(err){
							//sys.log("operation finished "+sys.inspect(operation));
							
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
								
								if(_currentIndex >= _self.pendingOperations.length) {
									
									// clear all buffers as the transaction finished executing all operations
									clearTransactionBuffers();
									
									// prepend the error marker
									_results.unshift(null); 
									// call the final callback with aggregated ordered results list
									if(finalCallback)
										finalCallback.apply(this, _results);
								} else 
									executeCurrentOperation();
							}
							else {
								// clear all buffers as the transaction failed executing all operations
								clearTransactionBuffers();
								
								if(finalCallback)
									finalCallback.apply(this, [err]); // stop execution and notify final callback
							}
						};
					});
					
				//sys.log("executing "+operation.method+" with args "+sys.inspect(operation.args));
				
				// finally call the operation itself
				operation.method.apply(operation.context, operation.args);
			};
			
			/// execute current operation (first) and thus fall into recursion above...
			executeCurrentOperation();
		}
	};
};

