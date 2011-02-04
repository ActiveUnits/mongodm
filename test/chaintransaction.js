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

vows.describe("chain transaction")
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
	'full stack test': {
		topic: function(){
			var promise = new EventEmitter();
			var promiseResult = {};
			
			testContext.dbfacade
				.withCollection(testContext.collectionName, false, function(err, collection){
					promiseResult.withCollectionResult = {err: err, collection: collection};
				})
				.insert({a: 2}, function(err,doc){
					promiseResult.saveResult = {err: err, doc: doc};
				})
				.find({a: 2}, function(err,docs){
					promiseResult.findResult = {err: err, docs: docs};
				})
				.limit(1)
				.skip(0)
				.remove({a: 2},function(err){
					promiseResult.removeResult = {err: err};
				})
				.insert({a: 3}, function(err, doc){
					promiseResult.saveResult2 = {err: err, doc: doc};
				})
				.count({a: 2}, function(err, c){
					promiseResult.countResult = {err: err, c: c};
				})
				.count({a: 3}, function(err, c){
					promiseResult.countResult2 = {err: err, c: c};
				})
				.drop(function(err){
					promiseResult.drop = {err: err};
				})
				.end(function(err, saveObj, foundObjs, removedObjErr, saveObj2, c1, c2, dropResult){
					promise.emit("success", err, {'chainResult': arguments, 'promiseResult': promiseResult});
				});
			return promise;
		},
		'should not be error': function() {
			assert.isNull(arguments[0]);
			assert.isObject(arguments[1]);
			
			var result = arguments[1];
			for(var i in result.promiseResult) {
				assert.isObject(result.promiseResult[i]);
				assert.isNull(result.promiseResult[i].err);
			}
			
			assert.isArray(result.promiseResult.saveResult.doc);
			
			assert.isArray(result.promiseResult.findResult.docs);
			assert.equal(result.promiseResult.findResult.docs.length, 1);
			assert.isObject(result.promiseResult.findResult.docs[0]);
			assert.isNumber(result.promiseResult.findResult.docs[0].a);
			assert.equal(result.promiseResult.findResult.docs[0].a,2);
			
			assert.isArray(result.promiseResult.saveResult2.doc);
			
			assert.isNumber(result.promiseResult.countResult.c);
			assert.equal(result.promiseResult.countResult.c,0);
			
			assert.isNumber(result.promiseResult.countResult2.c);
			assert.equal(result.promiseResult.countResult2.c,1);
			
			//err
			assert.isNull(result.chainResult[0]);
			
			//saveObj
			assert.isArray(result.chainResult[1]);
			
			//foundObjs
			assert.isArray(result.chainResult[2]);
			assert.equal(result.chainResult[2].length, 1);
			assert.isObject(result.chainResult[2][0]);
			assert.isNumber(result.chainResult[2][0].a);
			assert.equal(result.chainResult[2][0].a,2);
			
			//removedObjErr
			assert.isNull(result.chainResult[3]);
			
			//saveObj2
			assert.isArray(result.chainResult[4]);
			
			//c1
			assert.isNumber(result.chainResult[5]);
			assert.isNumber(result.chainResult[5],0);
			
			//c2
			assert.isNumber(result.chainResult[6]);
			assert.isNumber(result.chainResult[6],1);
			
			//drop
			assert.isTrue(result.chainResult[7]);
		}
	}
})
.addBatch({
	'collection should be empty': {
		topic: function() {
			var promise = new EventEmitter();
			testContext.dbfacade
				.withCollection(testContext.collectionName)
				.find({},function(err, results){
					promise.emit("success", err, results);
				});
			return promise;
		},
		'should return empty result set': function(){
			assert.isNull(arguments[0]);
			assert.isArray(arguments[1]);
			assert.equal(arguments[1].length,0);
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