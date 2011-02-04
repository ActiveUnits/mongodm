var sys = require("sys");
var vows = require("vows");
var assert = require('assert');
var EventEmitter = require("events").EventEmitter;

var mongodm = require("../index");

var testContext = {
	dbfacade: null,
	user: null,
	lastRemovedObject: null,
	lastCreatedObject: null
};

var UserDocumentDefinition = {
	methods: {
		findOneByUsername : function(username, callback) {
			this.withCollection()
					.findOne({username: username}, callback);
		},
		countAndSearch : function(pattern,limit,offset,callback) {
			this.withTransaction()
					.find(pattern)
					.limit(limit)
					.skip(offset)
					.count(pattern)
					.end(callback);
		}
	},
	
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
					}
				}
			}
		},
		methods: {
			matchUsername : function(username) {
				return this.username == username;
			}
		},
		on: {
			save: function() {
				if(this.createdAt == null)
					this.createdAt = new Date();
				
				testContext.lastCreatedObject = this;
			},
			remove : function() {
				testContext.lastRemovedObject = this;
			}
		}
	}
};

vows.describe("document modeling")
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
			assert.isFunction(Doc.findOneByUsername);
			assert.isFunction(Doc.countAndSearch);
			assert.isFunction(Doc.withCollection);
			assert.isFunction(Doc.withTransaction);
		}
	}
})
.addBatch({
	'create document instance': {
		topic: function(){
			return new (testContext.dbfacade.withDocument("User"));
		},
		'should return valid document instance': function(doc) {
			assert.isObject(doc);
			assert.isFunction(doc.save);
			assert.isFunction(doc.remove);
			assert.equal(doc.username, "");
			assert.equal(doc.password, "");
			assert.isNull(doc.createdAt);
			assert.equal(doc.deeply.nested.property.value, "default");
		}
	}
})
.addBatch({
	'create new document model & save to db': {
		topic: function(){
			var promise = new EventEmitter();
			
			var user = new (testContext.dbfacade.withDocument("User"));
			user.username = "TestUser";
			user.deeply.nested.property.value = "TEST"; 
			user.save(function(err){
				promise.emit("success", err);
			});
			
			return promise;
		},
		'should not return error': function(err) {
			assert.isNull(err);
			assert.isObject(testContext.lastCreatedObject);
		}
	}
})
.addBatch({
	'find last created document from db using its static method findByUsername': {
		topic: function(){
			var promise = new EventEmitter();
			
			testContext.dbfacade.withDocument("User")
							.findOneByUsername("TestUser", function(err, user){
								promise.emit("success", err, user);
							});
			
			return promise;
		},
		'should not return error': function() {
			assert.isNull(arguments[0]);
			assert.isObject(arguments[1]);
			
			var user = arguments[1];
			assert.isString(user.username);
			assert.isString(user.password);
			assert.equal(typeof user.createdAt,"object");
			assert.isString(user.deeply.nested.property.value);
			assert.equal(user.deeply.nested.property.value, "TEST");
		}
	}
})
.addBatch({
	'find last created document from db using document find method via transaction': {
		topic: function(){
			var promise = new EventEmitter();
			
			testContext.dbfacade.withDocument("User").withTransaction()
								  .find({username: "TestUser"})
								  .end(function(err, users){
									  promise.emit("success", err, users);
								  });
			return promise;
		},
		'should not return error': function() {
			assert.isNull(arguments[0]);
			assert.isArray(arguments[1]);
			assert.isObject(arguments[1][0]);
			
			var user = arguments[1][0];
			assert.isString(user.username);
			assert.isString(user.password);
			assert.equal(typeof user.createdAt,"object");
			assert.isString(user.deeply.nested.property.value);
			assert.equal(user.deeply.nested.property.value, "TEST");
		}
	}
})
.addBatch({
	'find last created document from db using document find method via collection': {
		topic: function(){
			var promise = new EventEmitter();
			
			testContext.dbfacade.withDocument("User").withCollection()
								  .find({username: "TestUser"},function(err, users){
									  promise.emit("success", err, users);
								  });
			return promise;
		},
		'should not return error': function() {
			assert.isNull(arguments[0]);
			assert.isArray(arguments[1]);
			assert.isObject(arguments[1][0]);
			
			var user = arguments[1][0];
			assert.isString(user.username);
			assert.isString(user.password);
			assert.equal(typeof user.createdAt,"object");
			assert.isString(user.deeply.nested.property.value);
			assert.equal(user.deeply.nested.property.value, "TEST");
		}
	}
})
.addBatch({
	'remove last found user': {
		topic : function() {
			var promise = new EventEmitter();
			testContext.lastCreatedObject.remove(function(err){
				promise.emit("success",err);
			});
			return promise;
		},
		'should not return error':function(err) {
			assert.isNull(err);
			assert.isObject(testContext.lastRemovedObject);
		}
	}
})
.addBatch({
	'count and search in simulated asynch way wave 1': {
		topic: function(){
			var promise = new EventEmitter();
			
			testContext.dbfacade.withDocument("User")
								.countAndSearch({},1,0,function(err,results,total){
									promise.emit("success", err, results, total);
								});
			return promise;
		},
		'should not return error': function() {
			assert.isNull(arguments[0]);
			assert.isArray(arguments[1]);
			assert.isNumber(arguments[2]);
		}
	},
	'count and search in simulated asynch way wave 2': {
		topic: function(){
			var promise = new EventEmitter();
			
			testContext.dbfacade.withDocument("User")
								.countAndSearch({},1,0,function(err,results,total){
									promise.emit("success", err, results, total);
								});
			return promise;
		},
		'should not return error': function() {
			assert.isNull(arguments[0]);
			assert.isArray(arguments[1]);
			assert.isNumber(arguments[2]);
		}
	},
	'create new document model & save to db': {
		topic: function(){
			var promise = new EventEmitter();
			
			var user = new (testContext.dbfacade.withDocument("User"));
			user.username = "TestUser2";
			user.deeply.nested.property.value = "TEST2"; 
			user.save(function(err){
				promise.emit("success", err);
			});
			
			return promise;
		},
		'should not return error': function(err) {
			assert.isNull(err);
			assert.isObject(testContext.lastCreatedObject);
		}
	},
	'count and search in simulated asynch way wave 3': {
		topic: function(){
			var promise = new EventEmitter();
			
			testContext.dbfacade.withDocument("User")
								.countAndSearch({},1,0,function(err,results,total){
									promise.emit("success", err, results, total);
								});
			return promise;
		},
		'should not return error': function() {
			assert.isNull(arguments[0]);
			assert.isArray(arguments[1]);
			assert.isNumber(arguments[2]);
		}
	}
})
.addBatch({
	'count and search': {
		topic: function(){
			var promise = new EventEmitter();
			
			testContext.dbfacade.withDocument("User")
								.countAndSearch({},1,0,function(err,results,total){
									promise.emit("success", err, results, total);
								});
			return promise;
		},
		'should not return error': function() {
			assert.isNull(arguments[0]);
			assert.isArray(arguments[1]);
			assert.isNumber(arguments[2]);
			assert.equal(arguments[2] != 0, true);
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