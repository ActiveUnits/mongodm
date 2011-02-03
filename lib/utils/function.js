//var sys = require("sys");

exports.fargs = function(_arguments) {
	var index = 0;
	return {
		required: function(err) {
			if(typeof _arguments[index] == "undefined")
				throw err;
			index+=1;
			return this;
		},
		skipAsValue: function(value) {
			if(typeof _arguments[index] == "undefined")
				_arguments[index] = value;
			else
			if(typeof _arguments[index] == "function") {  
				_arguments[index+1] = _arguments[index]; // move function next as argument (push backward as callback)
				_arguments[index] = value;
				if(index+1 >= _arguments.length)
					_arguments.length = index+2;
				//sys.log("SKIPVALUE:"+sys.inspect(_arguments)+" "+_arguments.length);
			}
			index += 1;
			return this;
		},
		skipAsFunction : function(value) {
			if(typeof _arguments[index] == "undefined") 
				_arguments[index] = value;
			else
			if(typeof _arguments[index] != "function") {
				_arguments[index+1] = _arguments[index]; // move object next as argument (push backward default params)
				_arguments[index] = value;
				if(index+1 >= _arguments.length)
					_arguments.length = index+2;
				//sys.log("SKIPFUNC:"+sys.inspect(_arguments)+" "+_arguments.length);
			}
			index += 1;
			return this;
		},
		mixValueWith: function(f) {
			if(typeof _arguments[index] == "undefined")
				_arguments[index] = f(null);
			else
			if(typeof _arguments[index] == "function") {
				_arguments[index+1] = _arguments[index]; // move function next as argument (push backward as callback)
				_arguments[index] = f(_arguments[index]);
				if(index+1 >= _arguments.length)
					_arguments.length = index+2;
			}
			else
				_arguments[index] = f(_arguments[index]);
			
			index += 1;
			return this;
		},
		// if last is function  or undefined then it is overriden, otherwise an additional argument is appended at the end
		lastAsFunction: function(f) {
			if(typeof _arguments[_arguments.length-1] == "function" || typeof _arguments[_arguments.length-1] == "undefined")
				_arguments[_arguments.length-1] = f(_arguments[_arguments.length-1]);
			else 
				_arguments[_arguments.length] = f(null);
			//sys.log("LASTFUNC:"+sys.inspect(_arguments)+" "+_arguments.length);
		}
	};
};