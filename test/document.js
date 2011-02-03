var sys = require("sys");
var vows = require("vows");
var assert = require('assert');

var mongodm = require("../index");

var testContext = {
	dbfacade: null,
	user: null,
	lastRemovedObject: null,
	lastCreatedObject: null
};

var userDefinition = {
	schema: {
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
	
	on: {
		save: function() {
			if(this.createdAt == null)
				this.createdAt = new Date();
			
			testContext.lastCreatedObject = this;
		},
		remove : function() {
			testContext.lastRemovedObject = this;
		}
	},
	
	methods: {
		matchUsername : function(username) {
			return this.username == username;
		}
	},
	
	static: {
		findOneByUsername : function(username, callback) {
			this.withCollection()
					.findOne({username: username}, callback);
		},
		countAndSearch : function(pattern,limit,offset,callback) {
			this.withTransaction()
					.search(pattern)
					.limit(limit)
					.skip(offset)
					.count(pattern)
					.end(callback);
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
			return dbfacade.defineModel("User", userDefinition);
		},
		'should return valid Document Object': function(Doc) {
			assert.isObject(Doc);
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
			return new (dbfacade.model("User"));
		},
		'should return valid document instance': function(doc) {
			assert.isObject(doc);
			assert.isFunction(doc.save);
			assert.isFunction(doc.remove);
			assert.isString(doc.username);
			assert.isString(doc.password);
			assert.isNull(doc.createdAt);
			assert.isString(doc.deeply.nested.property.value);
		}
	}
})
.addBatch({
	'create new document model & save to db': {
		topic: function(){
			var promise = new EventEmitter();
			
			var user = new (dbfacade.model("User"));
			user.username = "TestUser";
			user.deeply.nested.property.value = "TEST"; 
			user.save(function(err){
				promise.emit("success", err);
			});
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
			
			dbfacade.model("User").findOneByUsername("TestUser", function(err, user){
				promise.emit("success", err, user);
			});
		},
		'should not return error': function() {
			assert.isNull(arguments[0]);
			assert.isObject(arguments[1]);
			
			var user = arguments[1];
			assert.isString(user.username);
			assert.isString(user.password);
			assert.isObject(user.createdAt);
			assert.isString(user.deeply.nested.property.value);
			assert.equal(user.deeply.nested.property.value, "TEST");
		}
	}
})
.addBatch({
	'find last created document from db using document find method via transaction': {
		topic: function(){
			var promise = new EventEmitter();
			
			dbfacade.model("User").withTransaction()
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
			assert.isObject(user.createdAt);
			assert.isString(user.deeply.nested.property.value);
			assert.equal(user.deeply.nested.property.value, "TEST");
		}
	}
})
.addBatch({
	'find last created document from db using document find method via collection': {
		topic: function(){
			var promise = new EventEmitter();
			
			dbfacade.model("User").withCollection()
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
			assert.isObject(user.createdAt);
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