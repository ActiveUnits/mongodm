var sys = require("sys");
var vows = require("vows");
var assert = require('assert');
var EventEmitter = require("events").EventEmitter;
var ObjectID = require("mongodb/external-libs/bson").ObjectID;

var mongodm = require("../index");

var testContext = {
	dbfacade: null
};

var DocDefinition1 = {
	name: "D1",
	instance: {
    	fields: {
            name1: null
        }
    }
};

var DocDefinition2 = {
	name: "D2",
	instance: {
    	fields: {
            name2: null
        }
    }
};

var DocDefinition3 = {
	name: "D3",
	instance: {
    	fields: {
            name3: null
        }
    }
};

var DocDefinitionWrong = {
	instance: {
    	fields: {
            name3: null
        }
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
	'chain define document models': {
		topic: function(){
			var result = null;
			testContext.dbfacade.synch(true)
						.defineDocument(DocDefinition1, "Doc1")
						.defineDocument(DocDefinition2, "Doc2")
						.defineDocument(DocDefinition3, "Doc3")
						.end(function(err, doc1, doc2, doc3){
							result = arguments;
						});
			return result;
		},
		'should return valid Document Objects': function() {
			assert.isObject(arguments[0]);
			assert.isNull(arguments[0][0]);
			for(var i = 1; i<4; i++)
				assert.isFunction(arguments[0][i]);
		},
		'all document objects should be defined': function() {
			assert.isFunction(testContext.dbfacade.withDocument("Doc1"));
			assert.isFunction(testContext.dbfacade.withDocument("Doc2"));
			assert.isFunction(testContext.dbfacade.withDocument("Doc3"));
		}
	}
})
.addBatch({
	'chain define document models': {
		topic: function(){
			var result = null;
			testContext.dbfacade.synch(true)
						.defineDocument(DocDefinition1)
						.defineDocument(DocDefinition2)
						.defineDocument(DocDefinition3)
						.end(function(err, doc1, doc2, doc3){
							result = arguments;
						});
			return result;
		},
		'should return valid Document Objects': function() {
			assert.isObject(arguments[0]);
			assert.isNull(arguments[0][0]);
			for(var i = 1; i<4; i++)
				assert.isFunction(arguments[0][i]);
		},
		'all document objects should be defined': function() {
			assert.isFunction(testContext.dbfacade.withDocument("D1"));
			assert.isFunction(testContext.dbfacade.withDocument("D2"));
			assert.isFunction(testContext.dbfacade.withDocument("D3"));
		}
	}
})
.addBatch({
	'chain define wrong document model': {
		topic: function(){
			var result = null;
			testContext.dbfacade.synch(true)
						.defineDocument(DocDefinitionWrong)
						.end(function(err, doc){
							result = arguments;
						});
			return result;
		},
		'should return valid Document Objects': function() {
			assert.isObject(arguments[0]);
			assert.isNotNull(arguments[0][0]);
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
