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
				promise.emit("success", err, dbfacade);
			});
			
			return promise;
		},
		'should open connection without error': function() {
			assert.isNull(arguments[0]);
			assert.isObject(arguments[1]);
			testContext.dbfacade = arguments[1];
		}
	}
})
.addBatch({
	'drop & disconnect testdb':{
		topic:function(){
			var promise = new EventEmitter();
			testContext.dbfacade.drop(function(err){
				promise.emit("success", err);
			});
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