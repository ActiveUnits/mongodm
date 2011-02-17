var ObjectsPool = function(){
	this.objects = {};
};

ObjectsPool.prototype.set = function(name, value) {
	this.objects[name] = value;
};

ObjectsPool.prototype.get = function(name) {
	return this.objects[name];
};

module.exports = ObjectsPool;