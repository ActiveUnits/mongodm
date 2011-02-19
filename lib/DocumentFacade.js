var sys = require("sys"); 
var fargs = require("./utils/function").fargs;
var jsonTools = require("./utils/json");
var EventEmitter = require("events").EventEmitter;
var CollectionFacade = require("./CollectionFacade");

module.exports = function(db, documentDefinition){
	
	var facadeDocumentObject = function(obj) {
		var _self = obj;
		
		_self.__stagedFields__ = {};
		
		// define fields (skip any functions) and get default values in the same time.
		if(typeof documentDefinition.instance.fields != "undefined") {
			
			//expose all fields as properties
			var fieldNamesArr = [];
			for(var i in documentDefinition.instance.fields)
				fieldNamesArr.push(i);
			
			fieldNamesArr.forEach(function(fieldName){
				if(typeof documentDefinition.instance.fields[fieldName] == "function")
					continue;
				
				if(typeof _self[fieldName] == "undefined")
					_self[fieldName] = jsonTools.clone(documentDefinition.instance.fields[fieldName], ['__stagedFields__']);
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
		
		// set helper methods accessible inside DocumentFacade instance
		_self.withCollection = DocumentFacade.withCollection;
		_self.withTransaction = DocumentFacade.withTransaction;
		
		// ---------------------------- instance methods ---------------------------------------- 
		_self.save = function(callback) {
			
			if(typeof documentDefinition.instance != "undefined" && 
					typeof documentDefinition.instance.on != "undefined" &&
					typeof documentDefinition.instance.on["save"] == "function")
				documentDefinition.instance.on["save"].apply(_self, arguments);
				
			if(this._id == null) {
				//sys.log("SAVING "+sys.inspect(this.toJSON())+" <-> "+sys.inspect(this.fields));
				_self.withCollection()
					 .insert(this.toJSON(), function(err, doc){
						 
						 if(err == null) {
							 // store _id separated from fields 
							 _self._id = doc[0]._id;
							 
							 _self.__stagedFields__ = jsonTools.clone(_self, ['__stagedFields__']);
						 }
						 //sys.log("saved "+sys.inspect(doc[0].type));
						 if(callback)
							 callback(err, _self); // return always self instance assumming it is in sych with the DB stored.
					 });
			} else {
				/*sys.log("UPDATING "+sys.inspect(this.fields)+" id:"+this._id);*/
				/* sys.log("sending: "+sys.inspect(this.toUpdateJSON())); */
				_self.withCollection()
				 	 .update({_id: _self._id}, _self.toUpdateJSON(), function(err, doc){
				 		
				 		if(err == null)
				 			_self.__stagedFields__ = jsonTools.clone(_self.fields, ['__stagedFields__']);
				 		
				 		if(callback)
				 			callback(err, _self); // just for reference return always self instance 
				 	 });
			}
		};
		
		_self.remove =  function(callback) {
			if(typeof documentDefinition.instance != "undefined" &&
					typeof documentDefinition.instance.on != "undefined" &&
					typeof documentDefinition.instance.on["remove"] == "function")
				documentDefinition.instance.on["remove"].apply(_self, arguments);
			
			_self.withCollection()
				 .remove({_id: this._id}, function(err){
					_self._id = undefined;
					
					if(callback)
						 callback(err);
				 });
		};
		
		_self.toJSON = function() {
			return jsonTools.clone(this, ["__stagedFields__","_id"]);
		};
		
		_self.toUpdateJSON = function() {
			var differences = jsonTools.diff(_self, _self.__stagedFields__, ["__stagedFields__","_id"]);
			/* sys.log(sys.inspect(differences)); */
			
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
		
		return _self;
	};

	// ---------------------------- constructor ----------------------------------------
	var DocumentFacade = function(){
		facadeDocumentObject(this);
	};
		
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
		/*sys.log("fromJSON incoming: "+sys.inspect(json));*/
		var instance = facadeDocumentObject(json);
		return instance;
	};
	
	DocumentFacade.setTargetCollection = function(collection) {
		DocumentFacade.collection = collection;
		DocumentFacade.pendingCollectionFacades.forEach(function(pair){
			pair.facade.setTargetCollection(collection);
			if(pair.callback)
				pair.callback(null, collection);
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
			.skipAsFunction(null);
		
		var collectionFacade =  new CollectionFacade(db, false); // transaction synch mode
		collectionFacade.augmentResults = DocumentFacade.resultsAugmentHandler;
		
		if(collection != null){
			collectionFacade.setTargetCollection(collection);
			if(callback)
				callback(null, collection);
		} else
			DocumentFacade.pendingCollectionFacades.push({facade: collectionFacade, callback: callback});
		
		return collectionFacade;
	};

	DocumentFacade.withCollection = function(collection, callback) {
		fargs(arguments)
			.skipAsValue(DocumentFacade.collection)
			.skipAsFunction(null);
		
		var collectionFacade =  new CollectionFacade(db, true); // asynch mode
		collectionFacade.augmentResults = DocumentFacade.resultsAugmentHandler;
		
		if(collection != null){
			collectionFacade.setTargetCollection(collection);
			if(callback)
				callback(null, collection);
		} else
			DocumentFacade.pendingCollectionFacades.push({facade: collectionFacade, callback: callback});
		
		return collectionFacade;
	};
	
	return DocumentFacade;
};
