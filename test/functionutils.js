var fargs = require("../lib/utils/function").fargs;

var sys = require("sys");
var vows = require("vows");
var assert = require('assert');

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

var f3 = function(arg1) {
	fargs(arguments)
		.mixValueWith(function(value){
			if(value == null)
				value = {};
			value['augmented'] = true;
			return value;
		});
	
	return [arg1];
};

vows.describe("function")
.addBatch({
	'test f1 with missing arg1': {
		topic: function(){
			return f1;
		},
		'should throw exception': function(f) {
			assert.throws(f, Error);
		}
	},
	'test f1 with all required args for defaults': {
		topic: function(){
			return f1("arg1", "arg2");
		},
		'should return default values': function(array) {
			assert.isArray(array);
			assert.isString(array[0]);
			assert.equal(array[0], "arg1");
			assert.isString(array[1]);
			assert.equal(array[1], "arg2");
			assert.isString(array[2]);
			assert.equal(array[2], "string");
			assert.isNull(array[3]);
			assert.isNumber(array[4]);
			assert.equal(array[4], 100);
		}
	},
	'test f1 with all required args and partial values': {
		topic:function() {
			return f1("arg1", "arg2", function(){});
		},
		'should return valid arguments array': function(array) {
			assert.isArray(array);
			assert.isString(array[0]);
			assert.equal(array[0], "arg1");
			assert.isString(array[1]);
			assert.equal(array[1], "arg2");
			assert.isString(array[2]);
			assert.equal(array[2], "string");
			assert.isFunction(array[3]);
			assert.isNumber(array[4]);
			assert.equal(array[4], 100);
		}
	},
	'test f1 with all values': {
		topic:function() {
			return f1("arg1", "arg2", "arg3", function(){}, 200);
		},
		'should return valid arguments array': function(array) {
			assert.isArray(array);
			assert.isString(array[0]);
			assert.equal(array[0], "arg1");
			assert.isString(array[1]);
			assert.equal(array[1], "arg2");
			assert.isString(array[2]);
			assert.equal(array[2], "arg3");
			assert.isFunction(array[3]);
			assert.isNumber(array[4]);
			assert.equal(array[4], 200);
		}
	}
})
.addBatch({
	'test f2 with only one function': {
		topic: function() {
			return f2(function(){return 'value';});
		},
		'should return valid arguments array': function(array) {
			
			assert.isArray(array);
			
			assert.isString(array[0]);
			assert.equal(array[0], "string");
			
			assert.isNumber(array[1]);
			assert.equal(array[1], 100);
			
			assert.isFunction(array[2]);
			var result = array[2]();
			assert.equal(result, "value");
		}
	},
	'test f2 with values but without function':{
		topic: function() {
			return f2("arg1", 101);
		},
		'should return valid arguments array':function(array) {
			assert.isArray(array);
			assert.isString(array[0]);
			assert.equal(array[0], "arg1");
			assert.isNumber(array[1]);
			assert.equal(array[1], 101);
			assert.isFunction(array[2]);
			var result = array[2]();
			assert.isNull(result);
		}
	},
	'test f2 with all values':{
		topic: function() {
			return f2("arg1", 101, function(){ return "value"; });
		},
		'should return valid arguments array':function(array) {
			assert.isArray(array);
			assert.isString(array[0]);
			assert.equal(array[0], "arg1");
			assert.isNumber(array[1]);
			assert.equal(array[1], 101);
			assert.isFunction(array[2]);
			var result = array[2]();
			assert.equal(result, "value");
		}
	}
})
.addBatch({
	'test f3 without arguments': {
		topic : function() {
			return f3();
		},
		'should return valid arguments array':function(array) {
			assert.isArray(array);
			assert.isTrue(array[0]['augmented']);
		}
	},
	'test f3 with arguments arguments': {
		topic : function() {
			return f3({something: true});
		},
		'should return valid arguments array':function(array) {
			assert.isArray(array);
			assert.isTrue(array[0]['something']);
			assert.isTrue(array[0]['augmented']);
		}
	}
})
.export(module);