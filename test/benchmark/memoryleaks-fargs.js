// profiled manually using v8-profiler & node-inspector (install via npm)
var sys = require("sys");
var vows = require("vows");
var assert = require('assert');
var EventEmitter = require("events").EventEmitter;
var profiler = require('v8-profiler');

var fargs = require("../../lib/utils/function").fargs;

var f1 = function(arg1, arg2, arg3, arg4, arg5) {
	fargs(arguments)
		.required(new Error("arg1 required")) //1
		.required(new Error("arg2 required")) //2
		.skipAsValue("string") //3
		.skipAsFunction(null) //4
		.skipAsValue(100); //5
	
	//sys.log("WITHIN FUNCTION:"+sys.inspect(arguments));
	return [arg1, arg2, arg3, arg4, arg5];
};

var f2 = function(arg1, arg2, arg3) {
	fargs(arguments)
		.skipAsValue("string") //1
		.skipAsValue(100) //2
		.lastAsFunction(function(f){
			return function() {
				if(f)
					return f(); // 3
				else
					return null;
			};
		});
	//sys.log("WITHIN FUNCTION:"+sys.inspect(arguments));
	return [arg1, arg2, arg3];
};

var http = require('http');
http.createServer(function (req, res) {

  res.writeHead(200, {'Content-Type': 'text/plain'});
  f1("arg1", "arg2");
  f2(function(){return 'value';});
  res.end("done");
	  
}).listen(8124);
console.log('Server running at http://127.0.0.1:8124/');

