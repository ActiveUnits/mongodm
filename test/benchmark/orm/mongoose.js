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

Test.find({}, function(err, results){
    sys.log(results.length);
    sys.log("complete in "+((new Date()).getTime()-start.getTime())+" ms");
    mongoose.disconnect();
});
