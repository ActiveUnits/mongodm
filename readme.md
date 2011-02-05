# mongo data modeling for node.js #

using node-mongodb-native by christkv & etc... 

## simple ##
    var docDefition = {
			         	instance: {
			         		fields: {
			         			field: "defaultValue",
			         			field2: 100,
			         			field3: {
			         				nested: {
			         					fields: []
			         				}
			         			},
			         			createdAt: null,
			         			lastUpdatedAt: null
			         		},
			         		on: {
			         			save: function(){
			         				if(this.createdAt == null)
			         					this.createdAt = new Date();
			         				this.lastUpdatedAt = new Date();
			         			}
			         		}
			         	}
			         }
			         
    var mongo = require("mongodm");
    var db = mongo.withDatabase("myTestBase");
    
    var MyDoc = db.withDocument("myDoc", docDefinition);
    
	var myDoc1 = new MyDoc();
	myDoc1.field = "changedDefaultValue";
	
	myDoc1.save(function(err) {
		if(err == null) {
			myDoc1.field2 += 1;
			myDoc1.save(function(){
				console.log(myDoc1);
			});
		}
	});