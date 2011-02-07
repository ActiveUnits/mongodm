exports.chain = function(context) {
	return {
		pendingOperations : [],
		isHeader : true,
		
		bufferBy : function(bufferCheckHandler) {
			this.isBufferingOperations = bufferCheckHandler;
		},
		
		operation : function(name, handler) {
			var _self = this;
			this.isHeader = false;
			
			context[name] = function() {
				
				var isBuffering = true;
				if(typeof _self.isBufferingOperations === "function")
					isBuffering = _self.isBufferingOperations(name);
				
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
			};
			
			return this;
		},
		
		option : function(name, handler) {
			var _self = this;
			
			context[name] = function() {
				var args = [];
				for(var i in arguments)
					args[i] = arguments[i];
				
				args.unshift(_self.pendingOperations[_self.pendingOperations.length-1]);
				handler.apply(context, args);
			};
			
			return this;
		},
		
		end : function(name) {
			var _self = this;
			context[name] = function() {
				var args = [];
				for(var i in arguments)
					args[i] = arguments[i];
				
				if(arguments.length == 0)
					args.unshift(_self.executeAsynch);
				else
					args.unshift(_self.executeSynch(arguments[0]));
			};
			return context;
		},
		
		executeAsynch : function() {
			var _self = this;
			
			this.pendingOperations.forEach(function(operation){
				operation.method.apply(context, operation.args);
			});
			
			this.pendingOperations = [];
		},
		
		executeSynch : function(finalCallback) {
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
				operation.method.apply(context, operation.args);
			};
			
			/// execute current operation (first) and thus fall into recursion above...
			executeCurrentOperation();
		}
	};
};

