var fargs = require("./function").fargs;
var sys = require("sys");

exports.chain = function(context) {
	return {
		pendingOperations : [],
		asynch: true,
		
		bufferBy : function(bufferCheckHandler) {
			this.isBufferingOperations = bufferCheckHandler;
			return this;
		},
		
		operation : function(name, handler) {
			var _self = this;
			this.isHeader = false;
			
			context[name] = function() {
				
				var isBuffering = !_self.asynch;
				if(typeof _self.isBufferingOperations === "function")
					isBuffering = _self.isBufferingOperations(name, _self.asynch);
				
				var args = [];
				for(var i in arguments)
					args[i] = arguments[i];
				
				if(isBuffering) {
					var operation = {};
					operation.name = name;
					operation.method = handler;
					operation.args = args;
					_self.pendingOperations.push(operation);
				} else 
					handler.apply(context, args);
				
				return this;
			};
			
			return this;
		},
		
		option : function(name, handler) {
			var _self = this;
			
			context[name] = function() {
				if(_self.asynch == true)
					throw new Error("could not set options value on last operation because is in asynch mode. try ending the chain.");
				
				var args = [];
				for(var i in arguments)
					args[i] = arguments[i];
				
				args.unshift(_self.pendingOperations[_self.pendingOperations.length-1]);
				handler.apply(context, args);
				
				return this;
			};
			
			return this;
		},
		
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
				operation.method.apply(context, operation.args);
			};
			
			/// execute current operation (first) and thus fall into recursion above...
			executeCurrentOperation();
		}
	};
};

