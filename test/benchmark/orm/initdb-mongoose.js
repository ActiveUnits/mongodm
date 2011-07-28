var mongoose = require('mongoose');
var Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;
var sys = require("sys");

var start = new Date();
mongoose.connect('mongodb://localhost/test-mongoose');
var Test = mongoose.model('users', new Schema({
   field1     : String
  , field2      : String
  , field3      : String
  , field4      : String
  , field5      : String
}));

var docCount = 10000;
var savedCount = 0;

for(var i = 0; i<docCount; i++) {
    var testDoc = new Test();
    for(var k = 1; k<6; k++)
        testDoc["field"+k] = "lorem ipsulum";
    testDoc.save(function(){
        savedCount += 1;
        sys.log("saved "+savedCount);
        if(savedCount >= docCount) {
            sys.log("done");
            mongoose.disconnect();
            sys.log("complete in "+((new Date()).getTime()-start.getTime())+" ms");
        }
    });
}
