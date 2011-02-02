var sys = require("sys");
var vows = require("vows");
var assert = require('assert');
var EventEmitter = require("events").EventEmitter;

var mongodm = require("../index");

var testContext = {
	dbclient: null
};

vows.describe("mongodm")
.addBatch({
	'connect testdb':{
		topic:function(){
			var promise = new EventEmitter();
			mongodm.createClient("testdb",function(err, dbclient){
				promise.emit("success", err, dbclient);
			});
			return promise;
		},
		'should open connection without error': function() {
			assert.isNull(arguments[0]);
			assert.isObject(arguments[1]);
			assert.isObject(arguments[1].db);
			testContext.dbclient = arguments[1];
		}
	}
})
.addBatch({
	'disconnect testdb':{
		topic:function(){
			var promise = new EventEmitter();
			testContext.dbclient.close(function(err){
				promise.emit("success", err);
			});
			return promise;
		},
		'should close connection without error': function(){
			assert.isNull(arguments[0]);
			assert.isNull(testContext.dbclient.db);
			testContext.dbclient = null;
		}
	}
}).export(module);