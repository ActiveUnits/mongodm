var chainbuilder = require("../lib/utils/chainbuilder");
var fargs = require("../lib/utils/function").fargs;

var sys = require("sys");
var vows = require("vows");
var assert = require('assert');

vows.describe("function")
.addBatch({
	'test building an object with chain support': {
		topic: function(){
			var obj = function() {
				
			};
			
			var chain = chainbuilder.chain(obj.prototype);
			['method1', 'method2', 'method3'].forEach(function(method){
				chain.operation(method, function(){
					fargs(arguments)
						.skipAsValue(method);
					
					var args = [null];
					for(var i = 0; i<arguments.length-1; i++)
						args.push(arguments[i]);
					
					if(typeof arguments[arguments.length-1] == "function")
						arguments[arguments.length-1].apply(this,args);
				});
			});
			
			["option1", "option2"].forEach(function(option){
				chain.option(option, function(operation, value1){
					fargs(operation.args)
						.skipAsValue(value1);
				});
			});
			
			chain.finalizeWith('end');
			
			return obj;
		},
		'should return object to be created': function(obj) {
			assert.isFunction(obj);
		},
		'test instantiating returned object' : {
			topic: function(obj) {
				return new obj();
			},
			'should return object' : function(obj){
				assert.isObject(obj);
			},
			'should have all methods defined' : function(obj){
				assert.isFunction(obj.method1);
				assert.isFunction(obj.method2);
				assert.isFunction(obj.method3);
			},
			'should have all optiohns defined' : function(obj) {
				assert.isFunction(obj.option1);
				assert.isFunction(obj.option2);
			},
			'should method1() + method2() work': {
				topic : function(obj) {
					var result = {};
					obj.method1(function(err, name){
						result.call1 = name;
					});
					obj.method2(function(err, name){
						result.call2 = name;
					});
					return result;
				},
				'should return method1method2': function(result) {
					assert.isObject(result);
					assert.equal(result.call1, "method1");
					assert.equal(result.call2, "method2");
				}
			},
			'test chaining some operations': {
				topic: function(obj) {
					var result = {};
					
					obj.asynch(false)
					   .method3(function(err, name){
						   result.call1 = name;
						})
					   .option1("modified")
					   .method3(function(err, name){
						   result.call2 = name;
					   })
					   .option2("modified")
					   .end(function(err, call1Name,call2Name) {
						   result.endCall1 = call1Name;
						   result.endCall2 = call2Name;
					   });
					
					return result;
				},
				'should return proper result':function(result){
					assert.isObject(result);
					assert.equal(result.endCall1,"modified");
					assert.equal(result.endCall1,result.call1);
					assert.equal(result.endCall2,result.call2);
				}
			}
		}
	}
})
.export(module);