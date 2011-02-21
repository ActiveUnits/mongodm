var sys = require("sys");
var vows = require("vows");
var assert = require('assert');
var EventEmitter = require("events").EventEmitter;

var mongodm = require("../index");

var testContext = {
	dbfacade: null,
	user: null
};

var UserDocumentDefinition = {
	instance: {
		fields: {
			username: "",
			password: "",
			createdAt: null,
			lastLoginDate: null,
			deleted: false,
			deeply: {
				nested: {
					property: {
						value: "default"
					},
					nested: {
						value: "default2"
					}
				}
			}
		},
		on: {
			save: function() {
				if(this.createdAt == null)
					this.createdAt = new Date();
			}
		}
	}
};

vows.describe("document modeling case 1")
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
			return testContext.dbfacade.withDocument("User", UserDocumentDefinition);
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
			
			var user = new (testContext.dbfacade.withDocument("User"));
			user.username = "TestUser";
			user.deeply.nested.property.value = "TEST"; 
			
			user.save(function(){
				user.username = "TestUserUpdated";
				user.deeply.nested.nested.value = "TEST123123";
				user.deeply.nested.property.value = "TEST123123";
				
				user.save(function(err, obj){
					promise.emit("success", err, obj);
				});
			});
			testContext.user = user;
			
			return promise;
		},
		'should not return error': function() {
			assert.isNull(arguments[0]);
			assert.isObject(arguments[1]);
			assert.equal(arguments[1], testContext.user);
			assert.isNotNull(arguments[1]._id);
			assert.isNotNull(testContext.user._id);
			assert.equal(arguments[1].username, "TestUserUpdated");
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