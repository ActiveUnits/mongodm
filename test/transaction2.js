var sys = require("sys");
var vows = require("vows");
var assert = require('assert');
var EventEmitter = require("events").EventEmitter;

var mongodm = require("../index");

var testContext = {
	dbfacade: null
};

vows.describe("simple transaction with deep nested object properties")
.addBatch({
	'withDatabase testdb': {
		topic:function(){
			var promise = new EventEmitter();
			mongodm.withDatabase("testdb",function(err,dbfacade){
						promise.emit("success",err,dbfacade);
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
	'save document with nested elements in new collection': {
		topic: function(){
			var promise = new EventEmitter();
			var promiseResult = {};
			
			var collectionName = 'testDocuments'+Math.round(Math.random()*1000);
			testContext.collectionName = collectionName;
			testContext.dbfacade
				.withCollection(collectionName, function(err, collection){
					promiseResult.withCollectionResult = {err: err, collection: collection};
				})
				.save({a:2,nested:{deeply:{under:{the:{sea:'tresure'}}}}}, function(err,doc){
					promiseResult.insertResult = {err: err, doc: doc};
					promise.emit("success", promiseResult);
				});
			return promise;
		},
		'should return collection result': function(result) {
			assert.isNull(result.withCollectionResult.err);
			assert.isObject(result.withCollectionResult.collection);
		},
		'should return insert result': function(result){
			assert.isNull(result.insertResult.err);
			assert.isObject(result.insertResult.doc);
			
			testContext.obj = result.insertResult.doc;
		}
	}
})
.addBatch({
	'save/update last inserted document in last created collection': {
		topic: function(){
			var promise = new EventEmitter();
			testContext.obj.nested.deeply.under.the.sea = "found";
			testContext.dbfacade
				.withCollection(testContext.collectionName)
				.save(testContext.obj, function(err,doc){
					promise.emit("success", err, doc);
				});
			return promise;
		},
		'should return update result': function(){
			assert.isNull(arguments[0]);
			assert.isObject(arguments[1]);
			assert.equal(arguments[1].nested.deeply.under.the.sea,"found");
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
				});
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
				.find({nested:{deeply:{under:{the:{sea:'found'}}}}}, function(err, cursor){
					promise.emit("success", err, cursor);
				});
			return promise;
		},
		'should return find result': function(){
			assert.isNull(arguments[0]);
			assert.isObject(arguments[1]);
			arguments[1].toArray(function(err, results){
				assert.isNull(err);
				assert.equal(results.length, 1);
				assert.isObject(results[0]);
				assert.equal(results[0].nested.deeply.under.the.sea,"found");
				assert.equal(results[0]._id.id, testContext.obj._id.id);
			});
		}
	}
})
.addBatch({
	'remove document in last created collection': {
		topic : function(){
			var promise = new EventEmitter();
			testContext.dbfacade
				.withCollection(testContext.collectionName)
				.remove({_id: testContext.obj._id}, function(err, doc){
					promise.emit("success", err, doc);
				});
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
				.find({nested:{deeply:{under:{the:{sea:'found'}}}}}, function(err, cursor){
					promise.emit("success", err, cursor);
				});
			return promise;
		},
		'should return find result': function(){
			assert.isNull(arguments[0]);
			assert.isObject(arguments[1]);
			arguments[1].toArray(function(err, results){
				assert.isNull(err);
				assert.equal(results.length, 0);
			});
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
				});
			return promise;
		},
		'should return dropped collection result': function() {
			assert.isNull(arguments[0]);
		}
	}
})
.addBatch({
	'drop & close database testdb': {
		topic: function(){
			var promise = new EventEmitter();
			testContext.dbfacade.drop(function(err){
				promise.emit("success",err);
			});
			return promise;
		},
		'dbclient should be closed':function(){
			assert.isNull(arguments[0]);
		}
	}
})
.export(module);
	

