var sys = require("sys"); 
var fargs = require("./utils/function").fargs;
var jsonTools = require("./utils/json");
var EventEmitter = require("events").EventEmitter;
var CollectionFacade = require("./CollectionFacade");
var ObjectID = require("mongodb/external-libs/bson").ObjectID;

module.exports = function(dbfacade, documentDefinition){
	fargs(arguments)
		.required(new Error("db required"))
		.required(new Error("documentDefinition required"))
		.end();
	
	var convertToDotNotaionList = function(fieldsList, fieldName, fieldValue) {
		if(typeof fieldValue == "object" && Array.isArray(fieldValue)) {
			for(var index = 0; index<fieldValue.length; index++)
				convertToDotNotaionList(fieldsList, fieldName+"."+index, fieldValue[index]);
		} else if(typeof fieldValue == "object" && !(fieldValue instanceof Date)) {
			for(var key in fieldValue)
				convertToDotNotaionList(fieldsList, fieldName+"."+key, fieldValue[key]);
		} else {
			fieldsList[fieldName] = fieldValue;
		}
	};
	
	var convertToDotNotaionArray = function(fieldsArray, fieldName, fieldValue) {
		if(typeof fieldValue == "object" && Array.isArray(fieldValue)) {
			for(var index = 0; index < fieldValue.length; index++)
				convertToDotNotaionArray(fieldsArray, fieldName+"."+index, fieldValue[index]);
		} else if(typeof fieldValue == "object" && !(fieldValue instanceof Date)) {
			for(var key in fieldValue)
				convertToDotNotaionArray(fieldsArray, fieldName+"."+key, fieldValue[key]);
		} else {
			fieldsArray.push([fieldName, fieldValue]);
		}
	};
	
	var toJSONFunction = function() {
		var jsonObj = jsonTools.clone(this, ["__stagedFields__"]);
		if(this._id)
		    jsonObj._id = this._id.toString();
		return jsonObj;
	};
	
	var toUpdateJSONFunction = function() {
		var _self = this;
		
		if(typeof _self.__stagedFields__ != "undefined") {
			var differences = jsonTools.diff(_self, _self.__stagedFields__, ["__stagedFields__", "_id"]);
			//sys.log(sys.inspect(differences));
			
			var fieldsList = {};
			if(differences.diffs)
				for(var key in differences.result)
					convertToDotNotaionList(fieldsList, key, differences.result[key]);
			
			return {$set: fieldsList};
		} else 
			return jsonTools.clone(this, ["__stagedFields__", "_id"]);
	};
	
	var stageFieldsFunction = function(){
		this.__stagedFields__ = jsonTools.clone(this, ['__stagedFields__', "_id"]);
	};
	
	var clearStageFieldsFunction = function() {
		delete this.__stagedFields__;
	};
	
	var saveFunction = function(callback) {
		var _self = this; 
		
		if(typeof documentDefinition.instance != "undefined" && 
				typeof documentDefinition.instance.on != "undefined" &&
				typeof documentDefinition.instance.on["save"] == "function")
			documentDefinition.instance.on["save"].apply(_self, arguments);
			
		if(this._id == null) {
			//sys.log("SAVING "+sys.inspect(this.toJSON()));
			_self.withCollection()
				 .insert(jsonTools.clone(this, ["__stagedFields__", "_id"]), function(err, docs){
					 
					 if(err == null)
						 _self._id = docs[0]._id;
					 
					 //sys.log("saved "+sys.inspect(doc[0].type));
					 if(callback)
						 callback(err, _self); // return always self instance assumming it is in sych with the DB stored.
				 });
		} else {
			// sys.log("UPDATING "+sys.inspect(this.toUpdateJSON())+" id:"+this._id);
			var updateDoc = _self.toUpdateJSON();
			_self.withCollection()
			 	 .update({_id: _self._id}, updateDoc, function(err, doc){
			 		if(callback)
			 			callback(err, _self); // just for reference return always self instance 
			 	 });
			
			// clean up memory
			updateDoc = null;
			_self.clearStageFields();
		}
	};
	
	var removeFunction = function(callback) {
		var _self = this;
		
		if(typeof documentDefinition.instance != "undefined" &&
				typeof documentDefinition.instance.on != "undefined" &&
				typeof documentDefinition.instance.on["remove"] == "function")
			documentDefinition.instance.on["remove"].apply(_self, arguments);
		
		_self.withCollection()
			 .remove({_id: this._id}, function(err){
				_self._id = null;
				
				if(callback)
					 callback(err);
			 });
	};
	
	var referenceInstanceMethodFunction = function(context, i){ 
		return function(){
			return documentDefinition.instance.methods[i].apply(context, arguments);
		}; 
	};
		
	var facadeDocumentObject = function(obj) {
		var _self = obj;
		
		// set all document instance methods as such
		if(typeof documentDefinition.instance.methods != "undefined") {
			for(var i in documentDefinition.instance.methods) {
				_self[i] = documentDefinition.instance.methods[i];
			}
		}
		
		// set helper methods accessible inside DocumentFacade instance
		_self.withCollection = DocumentFacade.withCollection;
		
		// ---------------------------- instance methods ---------------------------------------- 
		_self.save = saveFunction;
		
		_self.remove = removeFunction;
		
		_self.toJSON = toJSONFunction;
		
		_self.toUpdateJSON = toUpdateJSONFunction;
		
		_self.stageFields = stageFieldsFunction;
		_self.clearStageFields = clearStageFieldsFunction;
				
		return _self;
	};

	// ---------------------------- constructor ----------------------------------------
	var DocumentFacade = function(){
		facadeDocumentObject(this);
		
		// define fields (skip any functions) and get default values in the same time.
		if(typeof documentDefinition.instance.fields != "undefined") {
			for(var i in documentDefinition.instance.fields) {
				if(typeof documentDefinition.instance.fields[i] == "function")
					return;
				
				if(typeof this[i] == "undefined")
					this[i] = jsonTools.clone(documentDefinition.instance.fields[i], ['__stagedFields__']);
			}
		}
	};
		
	// ---------------------------- static variables ----------------------------------------
	DocumentFacade.collection = null;
	
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
		return facadeDocumentObject(json);
	};
	
	DocumentFacade.find = function(pattern,options,callback) {
		fargs(arguments)
			.skipAsValue({})
			.skipAsValue({})
			.skipAsFunction(null)
			.end();
			
		if(pattern["_id"] && typeof pattern["_id"] != "object")
    		if(/^[0-9a-fA-F]{24}$/.test(pattern["_id"]))
	    	    pattern["_id"] = new ObjectID(pattern["_id"]);

		return DocumentFacade.withCollection().find(pattern, options, callback);
	};
	
	DocumentFacade.findOne = function(pattern,options,callback) {
		fargs(arguments)
			.skipAsValue({})
			.skipAsValue({})
			.skipAsFunction(null)
			.end();
			
		if(pattern["_id"] && typeof pattern["_id"] != "object")
    		if(/^[0-9a-fA-F]{24}$/.test(pattern["_id"]))
	    	    pattern["_id"] = new ObjectID(pattern["_id"]);
	    	    
		DocumentFacade.withCollection().findOne(pattern, options, callback);
	};
	
	DocumentFacade.count = function(pattern,callback) {
		fargs(arguments)
			.skipAsValue({})
			.skipAsFunction(null)
			.end();
			
		if(pattern["_id"] && typeof pattern["_id"] != "object")
    		if(/^[0-9a-fA-F]{24}$/.test(pattern["_id"]))
	    	    pattern["_id"] = new ObjectID(pattern["_id"]);
		
		return DocumentFacade.withCollection().count(pattern, callback);
	};
	
	DocumentFacade.ensureIndexes = function(callback) {
		// define fields (skip any functions) and get default values in the same time.
		if(typeof documentDefinition.indexes != "undefined") {
			
			//expose all fields as properties
			var indexesList = [];
			for(var key in documentDefinition.indexes)
				convertToDotNotaionArray(indexesList, key, documentDefinition.indexes[key]);
			
			DocumentFacade.collection.ensureIndex(indexesList, false, function(err, name){
				if(callback)
					callback(err, name);
			});
		} else
			if(callback)
				callback(null, null);
	};
	
	DocumentFacade.resultsAugmentHandler = function(operationName, results) {
		
		if(results == null || operationName == "insert" || operationName == "update")
			return;

		for(var i in results)
			if(results[i] != null)
				results[i] = DocumentFacade.fromJSON(results[i]);
	};

	DocumentFacade.withCollection = function(collection, callback) {
		fargs(arguments)
			.skipAsValue(DocumentFacade.collection)
			.skipAsFunction(null)
			.end();
		
		if(typeof collection == "string")
			collection = dbfacade.collections.get(collection);
		
		if(collection == null)
			throw new Error("could not acquire collection requested collection!");

		var collectionFacade =  new CollectionFacade(dbfacade);
		collectionFacade.augmentResults = DocumentFacade.resultsAugmentHandler;
		collectionFacade.collection = collection;
		return collectionFacade;
	};
	
	return DocumentFacade;
};
