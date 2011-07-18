var sys = require("sys");
var vows = require("vows");
var assert = require('assert');
var EventEmitter = require("events").EventEmitter;
var ObjectID = require("mongodb/external-libs/bson").ObjectID;

var mongodm = require("../index");

var testContext = {
	dbfacade: null
};

var DocDefinition = {
	instance: {
    	fields: {
            name: null,
            type: { name: null, array: []}
        }
    },
    indexes: {
    	name: 1,
    	type: { name: 1 }
    }
};

vows.describe("document modeling case 9 ids")
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
	'define document model': {
		topic: function(){
			var promise = new EventEmitter();
			testContext.dbfacade.withDocument("Doc", DocDefinition, function(err, doc){
				promise.emit("success", err, doc);
			});
			return promise;
		},
		'should return valid Document Object': function() {
			assert.isNull(arguments[0]);
			assert.isFunction(arguments[1]);
		}
	}
})
.addBatch({
	'save new document': {
		topic: function() {
			var promise = new EventEmitter();
			
			var doc = new (testContext.dbfacade.withDocument("Doc"));
			doc.name = "test";
			doc.type.name = "testtype";
			doc.type.array = ['item'];

			doc.save(function(err, obj){
				promise.emit("success", err, obj);
			});
			
			return promise;
		},
		'should not return error': function() {
			assert.isNull(arguments[0]);
			assert.isObject(arguments[1]);
			assert.isNotNull(arguments[1]._id);
			assert.equal(arguments[1].name, "test");
			assert.equal(arguments[1].type.name, "testtype");
			assert.isArray(arguments[1].type.array);
			assert.equal(arguments[1].type.array[0], 'item');
			
			var jsonObj = arguments[1].toJSON();
			assert.isString(jsonObj._id);
			
			testContext.docInstance = arguments[1];
		}
	}
})
.addBatch({
	'find using _id of type string': {
		topic: function() {
			var promise = new EventEmitter();
			testContext.dbfacade.withDocument("Doc")
				.find({_id: testContext.docInstance._id.toString()}, function(err, objs){
					promise.emit("success", err, objs);
				})
			
			return promise;
		},
		'should not return error': function() {
			assert.isNull(arguments[0]);
			assert.isArray(arguments[1]);
			assert.equal(arguments[1].length, 1);
		}
	}
})
.addBatch({
	'find using _id of type ObjectID': {
		topic: function() {
			var promise = new EventEmitter();
			
			testContext.dbfacade.withDocument("Doc")
				.find({_id: testContext.docInstance._id}, function(err, objs){
					promise.emit("success", err, objs);
				})
			
			return promise;
		},
		'should not return error': function() {
			assert.isNull(arguments[0]);
			assert.isArray(arguments[1]);
			assert.equal(arguments[1].length, 1);
		}
	}
})
.addBatch({
	'find one with _id of type string': {
		topic: function() {
			var promise = new EventEmitter();
			
			testContext.dbfacade.withDocument("Doc")
				.findOne({_id: testContext.docInstance._id.toString()}, function(err, obj){
					promise.emit("success", err, obj);
				})
			
			return promise;
		},
		'should not return error': function() {
			assert.isNull(arguments[0]);
			assert.isObject(arguments[1]);
		}
	}
})
.addBatch({
	'find one with _id of type ObjectID': {
		topic: function() {
			var promise = new EventEmitter();
			
			testContext.dbfacade.withDocument("Doc")
				.findOne({_id: testContext.docInstance._id}, function(err, obj){
					promise.emit("success", err, obj);
				})
			
			return promise;
		},
		'should not return error': function() {
			assert.isNull(arguments[0]);
			assert.isObject(arguments[1]);
		}
	}
})
.addBatch({
	'count with _id of type string': {
		topic: function() {
			var promise = new EventEmitter();
			
			testContext.dbfacade.withDocument("Doc")
				.count({_id: testContext.docInstance._id.toString()}, function(err, c){
					promise.emit("success", err, c);
				})
			
			return promise;
		},
		'should not return error': function() {
			assert.isNull(arguments[0]);
			assert.equal(arguments[1], 1);
		}
	}
})
.addBatch({
	'count with _id of type ObjectID': {
		topic: function() {
			var promise = new EventEmitter();
			
			testContext.dbfacade.withDocument("Doc")
				.count({_id: testContext.docInstance._id}, function(err, c){
					promise.emit("success", err, c);
				})
				.end();
			
			return promise;
		},
		'should not return error': function() {
			assert.isNull(arguments[0]);
			assert.equal(arguments[1], 1);
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
