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

vows.describe("document modeling case 4")
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
			return testContext.dbfacade.withDocument("Doc", DocDefinition);
		},
		'should return valid Document Object': function(Doc) {
			assert.isFunction(Doc);
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
	'find last saved doc': {
		topic: function() {
			var promise = new EventEmitter();
			
			testContext.dbfacade.withDocument("Doc")
				.findOne({name: "test"}, function(err, obj){
					if(obj)
						promise.emit("success", err, obj);
					else
						promise.emit("success", err);
				});
			
			return promise;
		},
		'should not return error': function() {
			assert.isNull(arguments[0]);
			assert.isObject(arguments[1]);
			assert.equal(arguments[1].name, "test");
			assert.equal(arguments[1].type.name, "testtype");
			assert.isArray(arguments[1].type.array);
			assert.equal(arguments[1].type.array[0], 'item');
			
			testContext.docInstance = arguments[1];
		}
	}
})
.addBatch({
	'update last found document': {
		topic: function() {
			var promise = new EventEmitter();
			
			var doc = testContext.docInstance;
			doc.name = "testupdated";
			doc.type.name = "testtype";
			doc.type.array = ['item2'];

			doc.save(function(err, obj){
				promise.emit("success", err, obj);
			});
			
			return promise;
		},
		'should not return error': function() {
			assert.isNull(arguments[0]);
			assert.isObject(arguments[1]);
			assert.isNotNull(arguments[1]._id);
			assert.equal(arguments[1].name, "testupdated");
			assert.equal(arguments[1].type.name, "testtype");
			assert.isArray(arguments[1].type.array);
			assert.equal(arguments[1].type.array[0], 'item2');
			
			testContext.docInstance = arguments[1];
		}
	}
})
.addBatch({
	'find last updated doc': {
		topic: function() {
			var promise = new EventEmitter();
			
			testContext.dbfacade.withDocument("Doc")
				.findOne({name: "testupdated"}, function(err, obj){
					if(obj)
						promise.emit("success", err, obj);
					else
						promise.emit("success", err);
				});
			
			return promise;
		},
		'should not return error': function() {
			assert.isNull(arguments[0]);
			assert.isObject(arguments[1]);
			assert.equal(arguments[1].name, "testupdated");
			assert.equal(arguments[1].type.name, "testtype");
			assert.isArray(arguments[1].type.array);
			assert.equal(arguments[1].type.array[0], 'item2');
			
			testContext.docInstance = arguments[1];
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