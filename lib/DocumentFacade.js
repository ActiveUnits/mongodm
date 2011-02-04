var sys = require("sys"); 
var fargs = require("./utils/function").fargs;
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
				this.fields[i] = documentDefinition.instance.fields[i];
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
		var instance = new DocumentFacade();
		for(var i in json)
			if(i != "_id")
				instance.fields[i] = json[i];
			else
				instance._id = json[i];
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
	
	DocumentFacade.withTransaction = function(collection, callback) {
		fargs(arguments)
			.skipAsValue(DocumentFacade.collection)
			.skipAsValue(null);
		
		var collectionFacade =  new CollectionFacade(db, false); // transaction synch mode
		collectionFacade.augmentResults = function(results) {
			if(results == null)
				return;
			
			// augment results to return document instances...
			for(var i in results)
				results[i] = DocumentFacade.fromJSON(results[i]);
		};
		
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
		collectionFacade.augmentResults = function(results) {
			if(results == null)
				return;
			
			// augment results to return document instances...
			for(var i in results)
				results[i] = DocumentFacade.fromJSON(results[i]);
		};
		
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
			this.withCollection()
				 .insert(this.toJSON(), function(err, doc){
					 if(err != null) {
						 _self._id = doc[0]._id;
						 _self.stagedFields = {};
					 	 for(var i in _self.fields)
					 		_self.stagedFields[i] = _self.fields[i];
					 }
					 
					 if(callback)
						 callback(err, _self); // return always self instance assumming it is in sych with the DB stored.
				 });
		} else {
			this.withCollection()
			 	 .update({_id: this._id}, {$set: this.toJSON(true)}, function(err, doc){
			 		_self.stagedFields = {};
			 		for(var i in _self.fields)
			 			_self.stagedFields[i] = _self.fields[i];
			 		
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
	
	DocumentFacade.prototype.toJSON = function(onlyDirtyFields) {
		fargs(arguments)
			.skipAsValue(false);
		
		var result = {};
		
		if(onlyDirtyFields) {
			// XXX this works but is not good solution... 
			var getChangesOnly = function(r, current, staged) {
				for(var i in current) {
					if(typeof current[i] == "object" && typeof staged[i] == "object") {
						r[i] = {};
						getChangesOnly(r[i], current[i], staged[i]);
					}
					else 
						if(current[i] != staged[i])
							r[i] = current[i];
				}
			};
			getChangesOnly(result, this.fields, this.stagedFields);
		}
		else
			for(var i in this.fields)
				result[i] = this.fields[i];
		
		return result;
	};
	
	return DocumentFacade;
};