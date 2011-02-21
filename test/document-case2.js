var sys = require("sys");
var vows = require("vows");
var assert = require('assert');
var EventEmitter = require("events").EventEmitter;

var mongodm = require("../index");

var testContext = {
	dbfacade: null,
	lastSavedDoc: null
};

var DocDefinition = {
	instance: {
    	fields: {
            name: null,
            token: null,
            user:{ userid: null, createdAt: null }, 
            createdAt: null,
            lastUpdatedAt: null,
            expiresAt: null
        },
    	on: {
    		save: function(){
                if(!this.createdAt)
                    this.createdAt = new Date();
                if(!this.user.createdAt)
                	this.user.createdAt = new Date();
                this.lastUpdatedAt = new Date();
            }	
    	}
    },
};

vows.describe("document modeling case 2")
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
			
			var expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate()+1);
			doc.expiresAt = expiresAt;
			
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
			
			testContext.lastSavedDoc = arguments[1]; 
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
						obj.user.userid = "blah";
						obj.save(function(err, obj){
							promise.emit("success", err, obj);
						});
					}
				});
			
			return promise;
		},
		'should not return error': function() {
			assert.isNull(arguments[0]);
			assert.isObject(arguments[1]);
			assert.isNotNull(arguments[1]._id);
			assert.equal(arguments[1].user.userid, "blah");
			assert.equal(arguments[1].createdAt.getTime(), testContext.lastSavedDoc.createdAt.getTime());
			assert.equal(arguments[1].name, "test");
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