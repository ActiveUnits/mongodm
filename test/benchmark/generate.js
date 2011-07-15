//profiled manually using v8-profiler & node-inspector (install via npm)
var sys = require("sys");
var vows = require("vows");
var assert = require('assert');
var EventEmitter = require("events").EventEmitter;

var mongodm = require("../../index");

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

var saveNewDocument = function(db){
	var promise = new EventEmitter();
	
	var user = new (db.withDocument("testData2"));
	user.username = "TestUser";
	user.deeply.nested.property.value = "TEST"; 
	
	user.save(function(err, obj){
		promise.emit("success", err, obj);
	});
	
	return promise;
};

mongodm.withDatabase("nodebench2",function(err,db){
	db.withDocument("testData2", UserDocumentDefinition, function(){
		var count = 300;
		var current = 0;
		var handleSave = function(){
			current += 1;
			if(current >= count) {
				console.log("generated "+count);
				db.close();
			}
		};
		
		for(var i = 0; i<count; i++)
			saveNewDocument(db).on("success", handleSave);
	});
	  
});

