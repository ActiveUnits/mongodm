var sys = require("sys");
var vows = require("vows");
var assert = require('assert');
var EventEmitter = require("events").EventEmitter;

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
    }
};

vows.describe("document modeling case 6")
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
			var result = {};
			result.doc = testContext.dbfacade.withDocument("Doc", DocDefinition);
			result.doc2 = testContext.dbfacade.withDocument("Doc2", DocDefinition);
			return result;
		},
		'should return valid Document Object': function(result) {
			assert.isFunction(result.doc);
			assert.isFunction(result.doc2);
		}
	}
})
.addBatch({
	'save new document': {
		topic: function() {
			var promise = new EventEmitter();
			
			var doc = new (testContext.dbfacade.withDocument("Doc2"));
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
			
			testContext.docInstance = arguments[1];
		}
	}
})
.addBatch({
	'find all withCollection(doc2)': {
		topic: function() {
			var promise = new EventEmitter();
			
			testContext.dbfacade.withDocument("Doc").withCollection("Doc2").synch(true)
				.find({name: "test"}, function(err, objs){
					if(objs)
						promise.emit("success", err, objs);
					else
						promise.emit("success", err);
				})
				.limit(1)
				.end();
			
			return promise;
		},
		'should not return error': function() {
			assert.isNull(arguments[0]);
			assert.isArray(arguments[1]);
			assert.equal(arguments[1].length, 1);
			assert.equal(arguments[1][0].name, "test");
			assert.equal(arguments[1][0].type.name, "testtype");
			assert.isArray(arguments[1][0].type.array);
			assert.equal(arguments[1][0].type.array[0], 'item');
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