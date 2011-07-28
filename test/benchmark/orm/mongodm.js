var sys = require("sys");
var mongodm = require("mongodm");

var start = new Date();
mongodm.withDatabase("test-mongodm", function(err, db) {
    db.defineDocument({
        name: "users",
        instance: {
            fields: {
                field1: null,
                field2: null,
                field3: null,
                field4: null,
                field5: null
            }
        }
    }, function(){
        db.withDocument("users").find({}, function(err, results){
            sys.log(results.length);
            sys.log("complete in "+((new Date()).getTime()-start.getTime())+" ms");
            db.close();
        });
    });
});
