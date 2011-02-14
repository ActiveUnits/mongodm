var sys = require("sys");
var vows = require("vows");
var assert = require('assert');
var EventEmitter = require("events").EventEmitter;

var mongodb = require("../index");


var testContext = {
	dbfacade: null
};

vows.describe("mongodm")
.addBatch({
	'withDatabase testdb':{
		topic:function(){
			var promise = new EventEmitter();
			var result = {};
			mongodb.withDatabase("testdb", function(err, dbfacade){
				result['withDatabase'] = arguments;
				sys.log("here / 1");
			}).end(function(){
				result['end round 1'] = arguments;
				sys.log("here / 2");
			}).end(function(err){
				result['end round 2'] = arguments;
				sys.log("here / 3");
				promise.emit("success", err, result);
			});
			
			return promise;
		},
		'should open connection without error': function() {
			assert.isNull(arguments[0]);
			assert.isObject(arguments[1]);
			for(var i in arguments[1])
				assert.isNull(arguments[1][i][0], sys.inspect(arguments[1][i]));
			
			testContext.dbfacade = arguments[1]["end round 2"][1];
		}
	}
})
.addBatch({
	'drop & disconnect testdb':{
		topic:function(){
			var promise = new EventEmitter();
			testContext.dbfacade.drop(function(err){
				promise.emit("success", err);
			}).end().end();
			return promise;
		},
		'should close connection without error': function(){
			assert.isNull(arguments[0]);
			assert.isNull(testContext.dbfacade.db);
			testContext.dbfacade = null;
		}
	}
})
.export(module);