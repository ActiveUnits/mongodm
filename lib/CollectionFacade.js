var sys = require("sys");
var fargs = require("./utils/function").fargs;
var chainbuilder = require("./utils/chainbuilder");
var mongo = require("mongodb");
var Cursor = require('mongodb').Cursor;

var CollectionFacade = function(dbfacade) {
	this.dbfacade = dbfacade;
	this.collection = null;
	this.augmentResults = null;
};

var chain = chainbuilder.createChain(CollectionFacade.prototype);

// create possible commands
['insert', 'remove', 'update', 'count', 'find', 'findOne', 'drop'].forEach(function(command){
	
	chainMethod = chain.defineMethod(command, function() {
		
		var _self = this;
		
		var augmentedResultHandler = function(docs) {
			// no need to augment nulls, but augment results if handler for this is set
			if(_self.augmentResults && typeof docs != "undefined")
				if(!Array.isArray(docs)) {
					var arr = [docs];
					_self.augmentResults(command, arr);
					arr = null;
				} else
					_self.augmentResults(command, docs);
		};

		// augment find command so that it returns always results not cursor.
		if(command == "find") {
			fargs(arguments)
				.skipAsValue({})
				.skipAsValue({})
				.lastAsFunction(function(f){
					return function(err, cursor){
						if(err == null)
							cursor.toArray(function(err, results){
								augmentedResultHandler(results);
								cursor.close();
								if(f)
									f(err, results);
							});					
						else
							if(f)
								f(err,null);
					};
				})
				.end();
		}

			
		// augment findOne command so that it returns augmented result if augmentResults function is present.
		if(command == "findOne") {
			fargs(arguments)
				.required(new Error("at least one argument is required for "+command))
				.skipAsValue({})
				.lastAsFunction(function(f){ // provide results augmentation handler
					return function(err, obj) {
						augmentedResultHandler(obj);
						if(f)
							f(err, obj);
					};
				})
				.end();
		}
			
		// normalize commands and inject save mode for every one + provide results augmentation support
		if(command == "remove" || command == "insert") {
			fargs(arguments)
				.required(new Error("at least one argument is required for "+command)) 
				.mixValueWith(function(value){ // provide normalized options and always safe mode.
					if(value == null)
						value = {};
					if(typeof value['safe'] == "undefined")
						value['safe'] = true;
					return value;
				})
				.lastAsFunction(function(f){ // provide results augmentation handler
					return function(err, objs) {
						augmentedResultHandler(objs);
						if(f)
							f(err, objs);
					};
				})
				.end();
		}
			
		if(command == "update") {
			fargs(arguments)
				.required(new Error("update spec is required")) 
				.required(new Error("update body is required"))
				.mixValueWith(function(value){ // provide normalized options and always safe mode.
					if(value == null)
						value = {};
					if(typeof value['safe'] == "undefined")
						value['safe'] = true;
					if(typeof value['upsert'] == "undefined")
						value['upsert'] = false;
					return value;
				})
				.lastAsFunction(function(f){ // provide results augmentation handler
					return function(err, objs){
						augmentedResultHandler(objs);
						if(f)
							f(err, objs);
					};
				})
				.end();
		}
		
		if(command == "drop") {
			this.dbfacade.db.dropCollection(this.collection.collectionName, arguments[arguments.length-1]);
			this.collection = null;
			return; // do no execute "drop" on collection, there isn't such method.
		}
				
		//sys.log("executing for real "+command+" "+sys.inspect(arguments));
		// execute the command on the collection
		this.collection[command].apply(this.collection, arguments);
	});
	
});

['limit','skip','sort','fields','timeout'].forEach(function(option) {
	
	chain.defineMethodOption(option, function(operation, value) {
	
		if(typeof value == "undefined") {
			return;
		}
		//sys.log(sys.inspect(operation));
		if(operation.name == "find") {
			
			// normalize findArguments
			fargs(operation.args)
				.skipAsValue({}) // selector/pattern
				.mixValueWith(function(v){ // options
					if(v == null)
						v = {};
					v[option] = value;
					return v;
				})
				.skipAsFunction(undefined)
				.end();
		}
	
	});
	
});

module.exports = CollectionFacade;