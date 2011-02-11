var sys = require("sys");
var vows = require("vows");
var assert = require('assert');
var EventEmitter = require("events").EventEmitter;

var mongodm = require("../index");

var testContext = {
	dbfacade: null,
	collectionName: 'testDocuments'+Math.round(Math.random()*1000),
	objID: null
};

vows.describe("simple transaction")
.addBatch({
	'withDatabase testdb': {
		topic:function(){
			var promise = new EventEmitter();
			mongodm.withDatabase("testdb",function(err,dbfacade){
						promise.emit("success",err,dbfacade);
					})
					.end(function(err){
						sys.log("first");
					})
					.end(function(err){
						sys.log("what?");
					});
			return promise;
		},
		'dbclient should be created': function(){
			assert.isNull(arguments[0]);
			testContext.dbfacade = arguments[1];
		}
	}
})
.addBatch({
	'insert document in new collection': {
		topic: function(){
			var promise = new EventEmitter();
			var promiseResult = {};
			
			testContext.dbfacade
				.withCollection(testContext.collectionName, function(err, collection){
					promiseResult.withCollectionResult = {err: err, collection: collection};
				})
				.insert({a: 2}, function(err,doc){
					promiseResult.insertResult = {err: err, doc: doc};
				})
				.end(function(){
					promise.emit("success", promiseResult);
				});
			return promise;
		},
		'should return collection result': function(result) {
			assert.isNull(result.withCollectionResult.err);
			assert.isObject(result.withCollectionResult.collection);
		},
		'should return save result with _id property': function(result){
			assert.isNull(result.insertResult.err);
			assert.isArray(result.insertResult.doc);
			assert.isObject(result.insertResult.doc[0]);
			assert.isObject(result.insertResult.doc[0]._id);
			
			testContext.objID = result.insertResult.doc[0]._id;
		}
	}
})
.addBatch({
	'update last inserted document in last created collection': {
		topic: function(){
			var promise = new EventEmitter();
			
			testContext.dbfacade
				.withCollection(testContext.collectionName)
				.update({_id: testContext.objID}, {$set: {a: 'updated'}}, function(err,doc){
					promise.emit("success", err, doc);
				})
				.end();
			
			return promise;
		},
		'should return update result with updated a property and _id': function(){
			assert.isNull(arguments[0]);
			assert.isObject(arguments[1]);
		}
	}
})
.addBatch({
	'count documents in last created collection': {
		topic : function(){
			var promise = new EventEmitter();
			
			testContext.dbfacade
				.withCollection(testContext.collectionName)
				.count({}, function(err,c){
					promise.emit("success", err, c);
				})
				.end();
			
			return promise;
		},
		'should return count result': function(){
			assert.isNull(arguments[0]);
			assert.isNumber(arguments[1]);
			assert.equal(arguments[1],1);
		}
	}
})
.addBatch({
	'find documents in last created collection': {
		topic : function(){
			var promise = new EventEmitter();
			
			testContext.dbfacade
				.withCollection(testContext.collectionName)
				.find({a: 'updated'}, function(err, cursor){
					promise.emit("success", err, cursor);
				})
				.end();
			
			return promise;
		},
		'should return find result': function(){
			assert.isNull(arguments[0]);
			assert.isArray(arguments[1]);
			assert.equal(arguments[1].length, 1);
			assert.equal(arguments[1][0].a, 'updated');
			assert.equal(arguments[1][0]._id.id, testContext.objID.id);
		}
	}
})
.addBatch({
	'remove document in last created collection': {
		topic : function(){
			var promise = new EventEmitter();
			testContext.dbfacade
				.withCollection(testContext.collectionName)
				.remove({_id: testContext.objID}, function(err, doc){
					promise.emit("success", err, doc);
				})
				.end();
			return promise;
		},
		'should return remove result': function(){
			assert.isNull(arguments[0]);
		}
	}
})
.addBatch({
	'find documents in last created collection': {
		topic : function(){
			var promise = new EventEmitter();
			testContext.dbfacade
				.withCollection(testContext.collectionName)
				.find({a: 'updated'}, function(err, cursor){
					promise.emit("success", err, cursor);
				})
				.end();
			return promise;
		},
		'should return find result': function(){
			assert.isNull(arguments[0]);
			assert.isArray(arguments[1]);
			assert.equal(arguments[1].length, 0);
		}
	}
})
.addBatch({
	'drop collection': {
		topic: function(){
			var promise = new EventEmitter();
			testContext.dbfacade
				.withCollection(testContext.collectionName)
				.drop(function(err){
					promise.emit("success", err);
				})
				.end();
			return promise;
		},
		'should return dropped collection result': function() {
			assert.isNull(arguments[0]);
		}
	}
})
.addBatch({
	'drop & close database': {
		topic: function(){
			var promise = new EventEmitter();
			var result = {};
			testContext.dbfacade
				.drop(function(err){
					result.dropErr = err;
				})
				.end(function(){
					result.args = arguments;
					promise.emit("success", result);
				});
			return promise;
		},
		'should return dropped collection result': function() {
			assert.isNull(arguments[0].dropErr);
			assert.isNull(arguments[0].args[0]);
		}
	}
})
.export(module);
	

