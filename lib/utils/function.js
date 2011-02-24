var sys = require("sys");

var fargsWalker = {
	required: function(err) {
		if(typeof this[this.index] == "undefined")
			throw err;
		this.index+=1;
		return this;
	},
	skipAsValue: function(value) {
		if(typeof this[this.index] == "undefined") {
			this[this.index] = value;
			if(this.index >= this.length)
				this.length = this.index+1;
		}
		else
		if(typeof this[this.index] == "function") {  
			this[this.index+1] = this[this.index]; // move function next as argument (push backward as callback)
			this[this.index] = value;
			if(this.index+1 >= this.length)
				this.length = this.index+2;
			//sys.log("SKIPVALUE:"+sys.inspect(this)+" "+this.length);
		}
		this.index += 1;
		return this;
	},
	skipAsFunction : function(value) {
		if(typeof this[this.index] == "undefined") {
			this[this.index] = value;
			if(this.index >= this.length)
				this.length = this.index+1;
		}
		else
		if(typeof this[this.index] != "function") {
			this[this.index+1] = this[this.index]; // move object next as argument (push backward default params)
			this[this.index] = value;
			if(this.index+1 >= this.length)
				this.length = this.index+2;
			//sys.log("SKIPFUNC:"+sys.inspect(this)+" "+this.length);
		}
		this.index += 1;
		return this;
	},
	mixValueWith: function(f) {
		if(typeof this[this.index] == "undefined") {
			this[this.index] = f(null);
			if(this.index >= this.length)
				this.length = this.index+1;
		}
		else
		if(typeof this[this.index] == "function") {
			this[this.index+1] = this[this.index]; // move function next as argument (push backward as callback)
			this[this.index] = f(null);
			if(this.index+1 >= this.length)
				this.length = this.index+2;
		}
		else
			this[this.index] = f(this[this.index]);
		
		this.index += 1;
		return this;
	},
	// if last is function  or undefined then it is overriden, otherwise an additional argument is appended at the end
	lastAsFunction: function(f) {
		if(typeof this[this.length-1] == "function" || typeof this[this.length-1] == "undefined")
			this[this.length-1] = f(this[this.length-1]);
		else {
			this[this.length] = f(null);
			this.length += 1;
		}
		//sys.log("LASTFUNC:"+sys.inspect(this)+" "+this.length);
		return this;
	},
	end : function() {
		for(var i in fargsWalker)
			delete this[i];
		delete this['index'];
	}
};

exports.fargs = function(_arguments) {
	
	// inject arguments walker index... 
	_arguments.index = 0;
	// inject arguments walker methods
	for(var i in fargsWalker)
		_arguments[i] = fargsWalker[i];
	return _arguments;
};