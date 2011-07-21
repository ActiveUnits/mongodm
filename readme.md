# mongo data modeling for node.js #

http://github.com/ActiveUnits/mongodm

## features ##

* lightweight wrapper over node-mongodb-native
* synchronious operation chains - chainable Document/Collection oriented find, count, insert, update & etc
* automatic management of mongodb indexes per Document/Collection
* Document to Object Mapping ( save, remove helper methods )
* support for Document fields defaults
* semi-transparent node-mongodb-native usage
* static Document/Object methods
* instance level Document/Object methods
* mongoDB collections pool
* mongoDB connections pool


## install ##

	npm install http://github.com/ActiveUnits/mongodm/tarball/master

### package.json ###

	{
		...
		, "dependencies": {
			...
			"mongodm": "http://github.com/ActiveUnits/mongodm/tarball/master"
		}
	}

## usage ##

### Database ###

#### create  ####
	var mongodm = require("mongodm");
	mongodm.withDatabase("testdb", [ "host", [ port ] ], function(err, db){
		.... 
	});

#### drop ####
	db.drop( function(err) { } )

#### close ####
	db.close( function(err) { } )

### Collection ###

#### create ####
	db.withCollection("testCollection", function(err, collection) {
		....
	});

#### find ####
	collection.find(pattern, options, function(err, resultsArray) { } )
* pattern can be object like { myField: "a", myOtherField: "b" } 
* options can be object like { limit: 1, skip: 2, sort: {}, fields: {} }
* resultsArray is array of JSON objects or null if there was error
* err is Error object if it happend or null


* [Refer to node-mongodb-native for more information](https://github.com/christkv/node-mongodb-native/blob/master/Readme.md)
* [Or take a look at generic pattern/query/options syntax at mongodb](http://www.mongodb.org/display/DOCS/Querying)
* [Refer to mongodb syntax about sortOptions](http://www.mongodb.org/display/DOCS/Sorting+and+Natural+Order)

#### findOne ####
	collection.findOne(pattern, options, function(err, resultObject) { } )
* pattern, options, err are the same as *collection.find*
* resultObject = JSON object returned from MongoDB

#### count ####
	collection.count(pattern, function(err, countNumber){ } )
* pattern, err are the same as *collection.find*
* countNumber = the count of Documents matching given pattern

#### remove ####
	collection.remove(pattern, options, function(err, success) { } )
* pattern is the same as *collection.find*
* options is the same as *collection.find* however defaults to { safe: true }

#### insert ####
	collection.insert(documentJSON, options, function(err, docs) { } )
* documentJSON = JSON object to be inserted or array of JSON objects
* options defaults to { safe: true }
* docs = Array containing inserted documents


* [Refer to MongoDB syntax for documentJSON](http://www.mongodb.org/display/DOCS/Inserting)

#### update ####
	collection.update(pattern, updateJSON, options, function(err, n) { } )
* pattern is the same as *collection.find*, used to find which documents should be updated
* updateJSON is JSON object which will be used to update matching documents
* options defaults to { safe: true, upsert: false }
* n = number of updated documents returned by node-mongodb-native


* [Refer to mongodb syntax for updateJSON supported modifier operations](http://www.mongodb.org/display/DOCS/Updating)

#### drop ####
	collection.drop(function(err) { } )

#### operation chains ####
	collection.synch(true)
				.findOne(pattern)
				.find(pattern)
					.limit(number)
					.skip(number)
					.sort(sortOptions)
					.fields(fieldsOptions)
				.count(pattern)
				.update(pattern, updateJSON)
				.insert(pattern, documentJSON)
				.remove(pattern)
				.end(function(err, findOneResult, findResult, countResult, updateResult, insertResult, removeResult) { } )

* only find used in synch mode can have chainable options: limit, skip, sort, fields
* all methods support standard parameters as described above including callback which will get invoked before the end callback.
* end callback will be invoked with err == null only if all operations succeed, otherwise the chain will stop executing on the first error.
* this is not transaction, there isn't any rollback (yet) 

### Document/Object ###
#### define document structure ####
To be able to use Object to Document mapping one should define the document structure within the database first via these to methods:

	db.withDocument(documentName, documentDefinition, function(err, documentClass) { } )
* documentName is the name of the collection which will be created as well the name of the Document-Object mapping
* documentDefinition is object describing the Document-Object mapping
* documentClass is ready made prototype which can be instantiated 


	db.defineDocument(documentDefinition, [ documentName ], function(err, documentClass) { } )
* documentName is optional, if not provided documentDefinition should have 'name' field giving the name of the Document-Object mapping
* documentDefinition is the same as *db.withDocument*
* documentClass is hte same as *db.withDocument*

There is support for chainable document definitions also:
	db.synch(true)
		.defineDocument(documentDefinition1)
		.defineDocument(documentDefinition2)
		.defineDocument(documentDefinition3)
		.end(function(err, docClass1, docClass2, docClass3) { } )
 
##### document structure #####
	db.defineDocument({
		name: "User",
		instance: {
			fields: {
				username: null,
				createdAt: null,
				updatedAt: null,
				nested: {
					field: null,
					array: []
				}
			},
			methods: {
				changeUsername: function(username) {
					this.username = username;
					this.save();
				}
			},
			on: {
				save: function() {
					if(this.createdAt == null)
						this.createdAt = new Date();
				},
				remove: function() {
					
				}
			}
		},
		methods: {
			findByUsername : function(username, callback) {
				this.withCollection().findOne({username: username}, callback);
			}
		},
		indexes: {
			username: 1,
			nested: {
				field: 1
			}
		}
	})

#### use defined Document-Objects ####
Once document is defined within the database with given name, its class can be retrieved at any time by using "withDocument" method
	var docClass = db.withDocument(documentName);
	var doc = new docClass();
	doc.username = "test";
	doc.save();
	doc.remove();
	...

#### save ####
	doc.save(function(err, updatedDoc) { })
#### remove ####
	doc.remove(function(err, success) { })
#### withCollection ####
	doc.withCollection().synch(true).count(pattern).find(pattern).end( function(err, count, docs) { } )
#### toJSON ####
	doc.toJSON()
#### updateFieldsFrom ####
	doc.updateFieldsFrom(object, keepFields)
