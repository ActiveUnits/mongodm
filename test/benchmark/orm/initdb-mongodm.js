var mongodm = require("mongodm");
var sys = require("sys");

var docCount = 10000;
var savedCount = 0;

var start = new Date();
mongodm.withDatabase("test-mongodm", function(err, db) {
    db.drop(function(err) {
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
            }, function(err, TestDocument){
                for(var i = 0; i<docCount; i++) {
                    var testDoc = new TestDocument();
                    for(var k = 1; k<6; k++)
                        testDoc["field"+k] = "lorem ipsulum";
                    testDoc.save(function(){
                        savedCount += 1;
                        sys.log("saved "+savedCount);
                        if(savedCount >= docCount) {
                            sys.log("done");
                            db.close();
                            sys.log("complete in "+((new Date()).getTime()-start.getTime())+" ms");
                        }
                    });
                }
            });
        });
    });
});
