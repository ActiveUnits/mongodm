var sys = require("sys");
var fargs = require("./utils/function").fargs;
var CollectionFacade = require("./CollectionFacade");

var DocumentFacade = function(db, collectionName, documentDefinition) {
	this.db = db;
	this.collectionName = collectionName;
	this.documentDefinition = documentDefinition;
	this.lastTransactionConnection = null;
};

DocumentFacade.prototype.compile = function() {
	var _self = this;
	
	var f = function() {
		var _fSelf = this;
		
		this.dirtyFields = {};
		this.fields = {};
		
		// define fields
		for(var i in _self.documentDefinition.fields)
			this.fields[i] = _self.documentDefinition.fields[i];
		
		//aggregate all schema properties(hopefully only variables atm)
		var fieldsArr = [];
		for(var i in this.fields)
			fieldsArr.push(i);
		fieldsArr.forEach(function(fieldName) {
			this.__defineSetter__(fieldName, function(value){
				_fSelf.update(fieldName,value);
			});
			this.__defineGetter__(fieldName, function(){
				return _fSelf.fields[fieldName];
			});
		}, this);
		
		// set all document instane methods as such
		for(var i in _self.documentDefinition.instance.methods)
			this[i] = function() {
				_self.documentDefinition.instance.methods.apply(this, arguments);
			};
			
		this.update = function(fieldName, value) {
			this.dirtyFields[fieldName] = true;
			this.fields[fieldName] = value;
		};
			
		// generic methods
		this.save = function(callback) {
			if(typeof _self.documentDefinition.instance.on != "undefined" &&
				typeof _self.documentDefinition.instance.on.save != "undefined")
					_self.documentDefinition.instance.on.save.call(this);
			
			if(typeof this._id == "undefined") {
				_self.withCollection()
					 .save(this.toJSON(), function(err, doc){
						 _fSelf._id = doc._id;
						 callback(err, _fSelf);
					 });
			} else {
				_self.withCollection()
				 	 .save(this.toJSON({_id: this._id}, true),function(err, doc){
				 		_fSelf.dirtyFields = {};
				 		callback(err, _fSelf);
				 	 });
			}
		};
		
		this.remove = function(callback) {
			if(typeof _self.documentDefinition.instance.on != "undefined" &&
					typeof _self.documentDefinition.instance.on.remove != "undefined")
						_self.documentDefinition.instance.on.remove.call(this);
			
			_self.withCollection()
				 .remove({_id: this._id}, function(err){
					 callback(err);
					_fSelf._id = undefined;
				 });
		};
		
		this.toJSON = function(mixedWith,onlyDirtyFields) {
			fargs(arguments)
				.skipAsValue({})
				.skipAsValue(false);
			
			var result = {};
			
			if(onlyDirtyFields)
				for(var i in this.dirtyFields)
					result[i] = this.fields[i];
			else
				for(var i in this.fields)
					result[i] = this.fields[i];
			
			if(typeof mixedWith != "undefined")
				for(var i in mixedWith)
					result[i] = mixedWith[i];
			
			return result;
		};
		
		// provide helper methods
		for(var i in _self)
			this[i] = _self[i];
	};
	
	// set all document methods as static
	for(var i in this.documentDefinition.methods)
		f[i] = _self.documentDefinition.methods[i];
	
	// provide helper methods
	for(var i in _self)
		f[i] = _self[i];
		
	return f;
};

DocumentFacade.prototype.withTransaction = function(collection, callback) {
	fargs(arguments)
		.skipAsValue(this.lastTransactionConnection)
		.skipAsValue(null);
	
	if(collection == null)
		collection = this.collectionName;
	
	return new CollectionFacade(this.db, collection, false, function(err, rawCollection){
		if(callback)
			callback(err, rawCollection);
		this.lastTransactionConnection = rawCollection;
	});
};

DocumentFacade.prototype.withCollection = function(collection, callback) {
	return new CollectionFacade(this.db, collection?collection:this.collectionName, true, callback);
};

module.exports = DocumentFacade;