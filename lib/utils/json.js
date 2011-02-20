var sys = require("sys");

var jsonPrimitives = {
	diff : function(current, history, ignoreFields) {
		/* sys.log("DIFF:"+sys.inspect(current)+"<->"+sys.inspect(history)); */
		if(typeof current == "undefined")
			throw new Error("can not diff null or undefined");
		
		if(typeof history == "undefined") {
			return {diffs: true, result: this.clone(current, ignoreFields)};
			
		} else if(typeof current == "object" && current instanceof Date) {
			if(!history || current.getTime() != (new Date(history)).getTime())
				return {diffs: true, result: this.clone(current, ignoreFields)};
			else
				return {diffs: false, result: null};
				
		} else if(typeof current == "object" && Array.isArray(current)) {
			if(history) {
				var diffResult = {diffs: false, result: []};
				
				for(var index in current) {
					var r = this.diff(current[index], history[index], ignoreFields);
					if(r.diffs) {
						diffResult.diffs = true;
						diffResult.result[index] = r.result;
					}
				}
				
				return diffResult;
				
			} else 
				return {diffs: true, result: this.clone(current, ignoreFields)};
		} else if(typeof current == "object") {
			if(history) {
				var diffResult = {diffs: false, result: {}};
				for(var key in current) {
					if(ignoreFields.indexOf(key) == -1) {
						var r = this.diff(current[key], history[key], ignoreFields);
						if(r.diffs) {
							diffResult.diffs = true;
							diffResult.result[key] = r.result;
						}
					}
				}
				
				return diffResult;
			} else 
				return {diffs: true, result: this.clone(current, ignoreFields)};
		}
		else
			if(typeof current != "function") {
				if(current != history) {
					/* sys.log("found value diff of "+current+" != "+history); */
					return {diffs: true, result: this.clone(current, ignoreFields)};
				}
				else
					return {diffs: false, result: null};
			}
			else
				return {diffs: false, result: null};
	},
	clone : function(input,ignoreFields) {
		if(typeof input == "undefined")
			return undefined;
			
		if(typeof input == "object" && input instanceof Date) {
			return new Date(input.getTime());
		} else if(typeof input == "object" && Array.isArray(input)) {
			var result = [];
			for(var key in input)
				result.push(this.clone(input[key], ignoreFields));
			return result;
		} else if(typeof input == "object" && input != null) {
			var result = {};
			for(var key in input)
				if(ignoreFields.indexOf(key) == -1)
					result[key] = this.clone(input[key], ignoreFields);
			return result;
		} else if(typeof input != "function")
			return input;
		else
			return undefined;
	}
};
module.exports = jsonPrimitives;