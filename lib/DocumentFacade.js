var sys = require("sys"); 
var fargs = require("./utils/function").fargs;
var jsonTools = require("./utils/json");
var EventEmitter = require("events").EventEmitter;
var CollectionFacade = require("./CollectionFacade");

module.exports = function(db, documentDefinition){

	// ---------------------------- constructor ----------------------------------------
	var DocumentFacade = function(){
		EventEmitter.call(this);
		
		var _self = this;
		
		this._id = null;
		this.stagedFields = {};
		this.fields = {};
		
		// define fields (skip any functions) and get default values in the same time.
		if(typeof documentDefinition.instance.fields != "undefined") {
			for(var i in documentDefinition.instance.fields) {
				if(typeof documentDefinition.instance.fields[i] == "function")
					continue;
				this.fields[i] = jsonTools.clone(documentDefinition.instance.fields[i]);
			}
			
			//expose all fields as properties
			var fieldNamesArr = [];
			for(var i in this.fields)
				fieldNamesArr.push(i);
			
			fieldNamesArr.forEach(function(fieldName) {
				_self.__defineSetter__(fieldName, function(value){
					_self.fields[fieldName] = value;
				});
				_self.__defineGetter__(fieldName, function(){
					return _self.fields[fieldName];
				});
			});
		}
		
		// set all document instance methods as such
		if(typeof documentDefinition.instance.methods != "undefined") {
			var methodNamesArr = [];
			for(var i in documentDefinition.instance.methods)
				methodNamesArr.push(i);
	
			methodNamesArr.forEach(function(methodName) {
				_self[methodName] = function(){
					return documentDefinition.instance.methods[methodName].apply(_self, arguments);
				};
			});
		}
		
		// bind all event listeners
		if(typeof documentDefinition.instance.on != "undefined") {
			var eventNamesArr = [];
			for(var i in documentDefinition.instance.on)
				eventNamesArr.push(i);
			eventNamesArr.forEach(function(eventName){
				if(typeof documentDefinition.instance.on[eventName] == "function")
					_self.on(eventName, function(){
						return documentDefinition.instance.on[eventName].apply(_self, arguments);
					});
			});
		}
		
		// set helper methods accessible inside DocumentFacade instance
		this.withCollection = DocumentFacade.withCollection;
		this.withTransaction = DocumentFacade.withTransaction;
	};
	sys.inherits(DocumentFacade, EventEmitter);
	
	// ---------------------------- static variables ----------------------------------------
	DocumentFacade.collection = null;
	DocumentFacade.pendingCollectionFacades = [];
	
	// ---------------------------- static methods ----------------------------------------
	
	// set all document static methods as such
	if(typeof documentDefinition.methods != "undefined") {
		var staticMethodNamesArr = [];
		for(var i in documentDefinition.methods)
			staticMethodNamesArr.push(i);
		
		staticMethodNamesArr.forEach(function(staticMethodName) {
			DocumentFacade[staticMethodName] = function(){
				return documentDefinition.methods[staticMethodName].apply(DocumentFacade, arguments);
			};
		});
	}
	
	DocumentFacade.fromJSON = function(json) {
		//sys.log("fromJSON incoming: "+sys.inspect(json));
		var instance = new DocumentFacade();
		for(var i in json)
			if(i != "_id")
				instance.fields[i] = jsonTools.clone(json[i]);
			else
				instance._id = json[i];
		instance.stagedFields = jsonTools.clone(instance.fields);
		//sys.log("fromJSON result:"+sys.inspect(instance));
		return instance;
	};
	
	DocumentFacade.setTargetCollection = function(collection) {
		DocumentFacade.collection = collection;
		DocumentFacade.pendingCollectionFacades.forEach(function(collectionFacade){
			collectionFacade.setTargetCollection(collection);
		});
	};
	
	DocumentFacade.find = function(pattern,options,callback) {
		fargs(arguments)
			.skipAsValue({})
			.skipAsValue({})
			.skipAsFunction(null);
		
		DocumentFacade.withCollection().find(pattern, options, callback);
	};
	
	DocumentFacade.findOne = function(pattern,options,callback) {
		fargs(arguments)
			.skipAsValue({})
			.skipAsValue({})
			.skipAsFunction(null);
		
		DocumentFacade.withCollection().findOne(pattern, options, callback);
	};
	
	DocumentFacade.count = function(pattern,callback) {
		fargs(arguments)
			.skipAsValue({})
			.skipAsFunction(null);
		
		DocumentFacade.withCollection().count(pattern, callback);
	};
	
	DocumentFacade.resultsAugmentHandler = function(operationName, results) {
		
		if(results == null || operationName == "insert" || operationName == "update")
			return;

		for(var i in results)
			if(results[i] != null)
				results[i] = DocumentFacade.fromJSON(results[i]);
	};
	
	DocumentFacade.withTransaction = function(collection, callback) {
		fargs(arguments)
			.skipAsValue(DocumentFacade.collection)
			.skipAsValue(null);
		
		var collectionFacade =  new CollectionFacade(db, false); // transaction synch mode
		collectionFacade.augmentResults = DocumentFacade.resultsAugmentHandler;
		
		if(collection == null)
			DocumentFacade.pendingCollectionFacades.push(collectionFacade);
		else
			collectionFacade.setTargetCollection(collection);
		
		return collectionFacade;
	};

	DocumentFacade.withCollection = function(collection, callback) {
		fargs(arguments)
			.skipAsValue(DocumentFacade.collection)
			.skipAsValue(null);
		
		var collectionFacade =  new CollectionFacade(db, true); // asynch mode
		collectionFacade.augmentResults = DocumentFacade.resultsAugmentHandler;
		
		if(collection == null)
			DocumentFacade.pendingCollectionFacades.push(collectionFacade);
		else
			collectionFacade.setTargetCollection(collection);
		
		return collectionFacade;
	};
	
	// ---------------------------- instance methods ---------------------------------------- 
	DocumentFacade.prototype.save = function(callback) {
		this.emit("save");
			
		var _self = this;
		if(this._id == null) {
			//sys.log("SAVING "+sys.inspect(this.toJSON())+" <-> "+sys.inspect(this.fields));
			this.withCollection()
				 .insert(this.toJSON(), function(err, doc){
					 
					 if(err == null) {
						 // store _id separated from fields 
						 _self._id = doc[0]._id;
						 
						 _self.stagedFields = jsonTools.clone(_self.fields);
					 }
					 
					 if(callback)
						 callback(err, _self); // return always self instance assumming it is in sych with the DB stored.
				 });
		} else {
			/*sys.log("UPDATING "+sys.inspect(this.fields)+" id:"+this._id);
			sys.log("sending: "+sys.inspect(this.toUpdateJSON()));*/
			this.withCollection()
			 	 .update({_id: this._id}, this.toUpdateJSON(), function(err, doc){
			 		
			 		if(err == null)
			 			_self.stagedFields = jsonTools.clone(_self.fields);
			 		
			 		if(callback)
			 			callback(err, _self); // just for reference return always self instance 
			 	 });
		}
	};
	
	DocumentFacade.prototype.remove =  function(callback) {
		this.emit("remove");
		
		var _self = this;
		this.withCollection()
			 .remove({_id: this._id}, function(err){
				_self._id = undefined;
				
				if(callback)
					 callback(err);
			 });
	};
	
	DocumentFacade.prototype.toJSON = function() {
		return jsonTools.clone(this.fields);
	};
	
	DocumentFacade.prototype.toUpdateJSON = function() {
		var differences = jsonTools.diff(this.fields, this.stagedFields);
		
		var fieldsList = {};
		var setFieldsToUpdate = function(fieldName, fieldValue) {
			if(typeof fieldValue == "object" && Array.isArray(fieldValue)) {
				for(var index in fieldValue)
					setFieldsToUpdate(fieldName+"."+index, fieldValue[index]);
			} else if(typeof fieldValue == "object" && !(fieldValue instanceof Date)) {
				for(var key in fieldValue)
					setFieldsToUpdate(fieldName+"."+key, fieldValue[key]);
			} else {
				fieldsList[fieldName] = fieldValue;
			}
		};
		
		if(differences.diffs)
			for(var key in differences.result)
				setFieldsToUpdate(key, differences.result[key]);
		
		return {$set: fieldsList};
	};
	
	return DocumentFacade;
};
