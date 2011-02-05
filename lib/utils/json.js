// source2: https://github.com/shimondoodkin/nodejs-clone-extend
var sys = require("sys");
var merger = require("./merger.js");

var jsonDataHandler = {
	diff : function(current, history) {
		//sys.log("DIFF:"+sys.inspect(current)+"<->"+sys.inspect(history));
		if(typeof current == "undefined")
			throw new Error("can not diff null or undefined");
		
		if(typeof history == "undefined") {
			return {diffs: true, result: this.clone(current)};
			
		} else if(typeof current == "object" && current instanceof Date) {
			
			if(current.getTime() != history.getTime())
				return {diffs: true, result: this.clone(current)};
			else
				return {diffs: false, result: null};
				
		} else if(typeof current == "object" && Array.isArray(current)) {
			var diffResult = {diffs: false, result: []};
			
			for(var key in current) {
				var r = this.diff(current[key], history[key]);
				if(r.dffs) {
					diffResult.diffs = true;
					diffResult.result.push(r.result);
				}
			}
			
			return diffResult;
			
		} else if(typeof current == "object") {
			var diffResult = {diffs: false, result: {}};
			for(var key in current) {
				var r = this.diff(current[key], history[key]);
				if(r.diffs) {
					diffResult.diffs = true;
					diffResult.result[key] = r.result;
				}
			}
			
			return diffResult;
		}
		else
			if(current != history) {
				//sys.log("found value diff of "+current+" != "+history);
				return {diffs: true, result: this.clone(current)};
			}
			else
				return {diffs: false, result: null};
	},
	clone : function(json) {
		return merger.clone(json);
	}
};
module.exports = jsonDataHandler;