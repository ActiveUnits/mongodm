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
    },
    indexes: {
    	name: 1,
    	type: { name: 1 }
    }
};

vows.describe("document modeling case 8 remove")
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
			
			testContext.docInstance = arguments[1];
		}
	}
})
.addBatch({
	'remove all with name test': {
		topic: function() {
			var promise = new EventEmitter();
			
			testContext.dbfacade.withDocument("Doc").withCollection()
				.remove({name: "test"}, function(err){
					promise.emit("success", err);
				});
			
			return promise;
		},
		'should not return error': function() {
			assert.isNull(arguments[0]);
		}
	}
})
.addBatch({
	'remove all with name test without callback': {
		topic: function() {
			testContext.dbfacade.withDocument("Doc").withCollection()
				.remove({name: "test"});
			return true;
		},
		'should not return error': function() {
			assert.equal(arguments[0], true);
		}
	}
})
.addBatch({
	'find all withCollection(doc)': {
		topic: function() {
			var promise = new EventEmitter();
			
			testContext.dbfacade.withDocument("Doc").withCollection().synch(true)
				.find({name: "test"}, function(err, objs){
					promise.emit("success", err, objs);
				})
				.limit(1)
				.end();
			
			return promise;
		},
		'should not return error': function() {
			assert.isNull(arguments[0]);
			assert.isArray(arguments[1]);
			assert.equal(arguments[1].length, 0);
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