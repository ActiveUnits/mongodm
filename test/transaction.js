var sys = require("sys");
var vows = require("vows");
var assert = require('assert');
var EventEmitter = require("events").EventEmitter;

var mongodm = require("../index");

var testContext = {
	dbfacade: null,
	collectionName: 'testDocuments'+Math.round(Math.random()*1000),
	obj: {a:2}
};

vows.describe("simple transaction")
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
	'save document in new collection': {
		topic: function(){
			var promise = new EventEmitter();
			var promiseResult = {};
			
			testContext.dbfacade
				.withCollection(testContext.collectionName, function(err, collection){
					promiseResult.withCollectionResult = {err: err, collection: collection};
				})
				.save(testContext.obj, function(err,doc){
					promiseResult.insertResult = {err: err, doc: doc};
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
			assert.isObject(result.insertResult.doc);
			assert.isObject(result.insertResult.doc._id);
			
			testContext.obj = result.insertResult.doc;
		}
	}
})
.addBatch({
	'save/update last inserted document in last created collection': {
		topic: function(){
			var promise = new EventEmitter();
			
			testContext.obj.a = "updated";
			
			testContext.dbfacade
				.withCollection(testContext.collectionName)
				.save(testContext.obj, function(err,doc){
					promise.emit("success", err, doc);
				});
			
			return promise;
		},
		'should return update result with updated a property and _id': function(){
			assert.isNull(arguments[0]);
			assert.isObject(arguments[1]);
			assert.equal(arguments[1].a, testContext.obj.a);
			assert.isObject(arguments[1]._id);
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
				.find({a: 'updated'}, function(err, cursor){
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
				assert.equal(results[0].a, testContext.obj.a);
				assert.equal(results[0]._id.id, testContext.obj._id.id);
			});
		}
	}
})
.addBatch({
	'search documents in last created collection': {
		topic : function(){
			var promise = new EventEmitter();
			
			testContext.dbfacade
				.withCollection(testContext.collectionName)
				.search({a: 'updated'}, function(err, results){
					promise.emit("success", err, results);
				});
			
			return promise;
		},
		'should return search result': function(){
			assert.isNull(arguments[0]);
			assert.isArray(arguments[1]);
			assert.equal(arguments[1].length, 1);
			assert.isObject(arguments[1][0]);
			assert.equal(arguments[1][0].a, testContext.obj.a);
			assert.equal(arguments[1][0]._id.id, testContext.obj._id.id);
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
				.find({a: 'updated'}, function(err, cursor){
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
	'search documents in last created collection': {
		topic : function(){
			var promise = new EventEmitter();
			testContext.dbfacade
				.withCollection(testContext.collectionName)
				.search({a: 'updated'}, function(err, results){
					promise.emit("success", err, results);
				});
			return promise;
		},
		'should return search result': function(){
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
				});
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
			testContext.dbfacade
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
.export(module);
	

