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
            token: null,
            createdAt: null,
            lastUpdatedAt: null
        },
    	on: {
    		save: function(){
                if(!this.createdAt)
                    this.createdAt = new Date();
                this.lastUpdatedAt = new Date();
            }	
    	},
    	methods: {
    		customMethod: function() {
    			this.name = "modified";
    		}
    	}
    }
};

vows.describe("document modeling case 3")
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
	'save new document and then update it within its save': {
		topic: function() {
			var promise = new EventEmitter();
			
			var doc = new (testContext.dbfacade.withDocument("Doc"));
			doc.token = "1";
			doc.name = "test";

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
			
			assert.isFunction(arguments[1].customMethod);
			arguments[1].customMethod();
			assert.equal(arguments[1].name, "modified");
		}
	}
})
.addBatch({
	'findOne and update it': {
		topic: function() {
			var promise = new EventEmitter();
			
			testContext.dbfacade.withDocument("Doc")
				.findOne({token: "1"}, function(err, obj){
					if(obj) {
						obj.name = "blah";
						obj.save(function(err, obj){
							promise.emit("success", err, obj);
						});
					} else
						promise.emit("success", err, obj);
				});
			
			return promise;
		},
		'should not return error': function() {
			assert.isNull(arguments[0]);
			assert.isObject(arguments[1]);
			assert.isNotNull(arguments[1]._id);
			assert.equal(arguments[1].name, "blah");
		}
	}
})
.addBatch({
	'find all': {
		topic: function() {
			var promise = new EventEmitter();
			
			testContext.dbfacade.withDocument("Doc")
				.find({token: "1"}, function(err, objs){
					if(objs)
						promise.emit("success", err, objs);
					else
						promise.emit("success", err);
				});
			
			return promise;
		},
		'should not return error': function() {
			assert.isNull(arguments[0]);
			assert.isArray(arguments[1]);
			assert.isNotNull(arguments[1][0]);
			assert.equal(arguments[1][0].name, "blah");
			assert.isFunction(arguments[1][0].customMethod);
			arguments[1][0].customMethod();
			assert.equal(arguments[1][0].name, "modified");
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