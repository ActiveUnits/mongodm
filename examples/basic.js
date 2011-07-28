// npm install http://github.com/ActiveUnits/mongodm/tarball/master
var mongodm = require("../");
var sys = require("sys");

var DocDefinition1 = {
    name: "Doc1",
    instance: {
        fields: {
            field1: "defaultValue"
        },
        on: {
            save: function() {
                sys.log("saving Doc1 Instnace "+sys.inspect(this.toJSON()));
            },
            remove: function() {
                sys.log("removing Doc1 Instance "+sys.inspect(this));
            }
        },
        methods: {
            myCustomMethod: function(myValue) {
                this.field1 = myValue;
            }
        }
    }
}

var DocDefinition2 = {
    name: "Doc2",
    instance: {
        fields: {
            field1: null
        }
    },
    methods: {
        findAllWithField1Value: function(field1, callback) {
            this.find({field1: field1}, callback);
        }
    }
}

// connect to database
mongodm.withDatabase("mongoDatabaseName", function(err, db) {

    // empty/drop the database
    db.drop();
    
    // define document structures 
    db.synch(true)
        .defineDocument(DocDefinition1)
        .defineDocument(DocDefinition2)
        
        // wait until all structures and collections are defined
        // docs after err are placed in the same sequence as they were defined
        .end(function(err, Doc1, Doc2) {
        
            if(err) {
                throw err;
            }
            
            // create Doc1 instance
            var doc1 = new Doc1();
            doc1.myCustomMethod("myValue");
            doc1.save(function(err, doc1Saved){ });

            // create Doc2 isntance, db.withDocument returns Doc2 actually
            var doc2 = new (db.withDocument("Doc2"));
            doc2.field1 = "myValue";
            doc2.save();
            
            // use Doc2 static method
            Doc2.findAllWithField1Value("myValue", function(err, results) {
                sys.log("all Doc2 results with myValue: "+sys.inspect(results));
            });
            
            // find all
            Doc1.find({field1: "myValue"}, function(err, results) {
                sys.log("Doc1 find all results: "+sys.inspect(results));
            });
            
            // find one
            Doc1.findOne({field1: "myValue"}, function(err, result) {
                sys.log("Doc1 find  one result: "+sys.inspect(result));
            });
            
            // remove instances
            doc1.remove();
            doc2.remove();
            
            // close database
            db.close();
        });
});
